# Memory Bank - Wallet System

## Purpose

The wallet module stores user balances, SePay deposit/payment transactions,
webhook reconciliation, transaction history, admin transaction analytics, and
the QR-payment path for pricing upgrades.

The booking module currently does not hold or release booking funds. Wallet is
mainly used for deposits, pricing QR payments, transaction reporting, and
balance checks during account deletion.

Primary source files:

- Routes: `SERVER/src/routes/wallet/wallet.routes.ts`
- Admin routes: `SERVER/src/routes/wallet/admin-wallet.routes.ts`
- Controller: `SERVER/src/controllers/wallet/wallet.controller.ts`
- Admin controller: `SERVER/src/controllers/wallet/admin-wallet.controller.ts`
- User wallet service: `SERVER/src/services/wallet/user-wallet.service.ts`
- Admin wallet service: `SERVER/src/services/wallet/admin-wallet.service.ts`
- Combined service: `SERVER/src/services/wallet/wallet.service.ts`
- Repositories:
  `SERVER/src/repositories/wallet/wallet.repository.ts`,
  `SERVER/src/repositories/wallet/wallet-balance.repository.ts`
- Models:
  `SERVER/src/models/wallet/wallet.model.ts`,
  `SERVER/src/models/wallet/wallet-transaction.model.ts`
- Constants: `SERVER/src/constants/wallet.ts`
- Validation: `SERVER/src/validations/wallet/wallet.validation.ts`
- SePay middleware: `SERVER/src/middleware/sepayWebhook.ts`
- Reconciliation job: `SERVER/src/jobs/wallet-reconciliation.job.ts`
- Frontend pages:
  `pr1as-client/app/wallet/page.tsx`,
  `pr1as-client/app/wallet/deposit/page.tsx`,
  `pr1as-client/app/client/wallet/page.tsx`,
  `pr1as-client/app/client/wallet/deposit/page.tsx`,
  `pr1as-client/app/dashboard/transactions/page.tsx`
- Frontend services/hooks:
  `pr1as-client/services/wallet.service.ts`,
  `pr1as-client/services/admin-wallet.service.ts`,
  `pr1as-client/lib/hooks/use-wallet.ts`,
  `pr1as-client/lib/hooks/use-admin-transactions.ts`

## Data Model

### Wallet

Collection: `wallet`.

| Field | Meaning |
| --- | --- |
| `user_id` | Unique user id. |
| `balance` | Denormalized wallet balance, minimum 0. |
| `updated_at` | Last balance update. |

The balance document is maintained with atomic credit/deduct operations.

### WalletTransaction

Collection: `wallet_transaction`.

Core fields:

| Field | Meaning |
| --- | --- |
| `user_id` | Owner user id. |
| `type` | `deposit`, `withdraw`, `payment`, or `refund`. |
| `amount` | Amount in VND. |
| `status` | `pending`, `success`, `failed`, or `cancelled`. |
| `gateway` | Currently `sepay`. |
| `description` | Human-readable description. |
| `purpose` | `deposit` or `pricing_upgrade`, nullable. |
| `purpose_metadata` | Extra purpose data. |
| `currency` | Defaults to VND. |
| `created_at`, `updated_at` | Manual timestamps. |

SePay/payment fields:

| Field | Meaning |
| --- | --- |
| `payment_code` | Generated PRAS payment code. |
| `payment_content` | Transfer content, currently same as payment code. |
| `qr_url` | SePay QR image URL. |
| `bank_account_number`, `bank_name` | Target bank info from config. |
| `gateway_transaction_id` | String gateway transaction id. |
| `gateway_response` | Raw webhook payload. |
| `sepay_transaction_id` | Numeric SePay id, unique partial index. |
| `sepay_gateway`, `sepay_transaction_date`, `sepay_account_number` | SePay metadata. |
| `sepay_code`, `sepay_content`, `sepay_transfer_type` | Transfer code/content/type. |
| `sepay_transfer_amount`, `sepay_accumulated`, `sepay_sub_account` | Amount/account metadata. |
| `sepay_reference_code`, `sepay_description` | Reference and description. |

Important indexes:

- `{ user_id: 1, created_at: -1 }`
- `payment_code`
- `gateway_transaction_id`
- partial unique `sepay_transaction_id_unique`
- `sepay_reference_code`
- `{ status: 1, type: 1 }`

## Constants and Limits

Transaction types:

- `deposit`
- `withdraw`
- `payment`
- `refund`

Statuses:

- `pending`
- `success`
- `failed`
- `cancelled`

Limits:

| Constant | Value |
| --- | --- |
| `MIN_DEPOSIT_AMOUNT` | 100 |
| `MAX_DEPOSIT_AMOUNT` | 50,000,000 |
| `MIN_WITHDRAW_AMOUNT` | 10,000 |
| `MAX_WITHDRAW_AMOUNT` | 50,000,000 |
| `MIN_BALANCE` | 0 |

SePay:

| Constant | Value |
| --- | --- |
| QR base | `https://qr.sepay.vn/img` |
| default code prefix | `PRAS` |
| suffix length | 10 |
| max generate attempts | 10 |

## User Routes

Mounted under `/api/wallet`.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/deposit/webhook` | SePay signature | Handle SePay webhook. |
| `GET` | `/deposit/webhook` | No | Health check for webhook endpoint. |
| `POST` | `/deposit` | Auth + CSRF | Create deposit QR transaction. |
| `GET` | `/balance` | Auth | Current wallet balance. |
| `GET` | `/transactions` | Auth | User transaction history. |
| `GET` | `/transactions/:transactionId` | Auth | User transaction detail. |

Webhook route is mounted before `authenticate`.

## Admin Routes

Mounted under `/api/admin/wallet`. All require `authenticate + adminOnly`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/transactions` | Admin transaction history. |
| `GET` | `/stats` | Transaction stats by preset date range. |
| `GET` | `/top-users` | Top transaction users by preset date range. |
| `GET` | `/chart` | Chart data by preset date range. |

Date range presets:

- `today`
- `yesterday`
- `last_7_days`
- `last_14_days`
- `last_30_days`
- `this_month`

## Deposit QR Flow

`POST /api/wallet/deposit`.

Validation:

- `amount` integer.
- min 100.
- max 50,000,000.

Flow:

1. Validate user exists.
2. Generate unique SePay payment code:
   - prefix from `config.sepay.paymentCodePrefix` or `PRAS`,
   - 10-digit random suffix,
   - retry up to 10 times.
3. Set `payment_content = payment_code`.
4. Build QR URL with:
   - `acc` bank account,
   - `bank` bank name,
   - `amount`,
   - `des` payment content.
5. Create `WalletTransaction`:
   - `type: deposit`,
   - `status: pending`,
   - `gateway: sepay`,
   - bank info and QR info,
   - `expires_at = now + WALLET_LIMITS.DEPOSIT_QR_TTL_MINUTES` (10 min),
   - description `Deposit <amount> - <paymentCode>`.
6. Return QR/payment info to frontend.

Response includes:

- `payment_url`
- `qr_url`
- `transaction_id`
- `payment_code`
- `payment_content`
- `bank_account_number`
- `bank_name`
- `amount`
- `expires_at` (ISO string)

### QR expiry (deposit only)

The QR has a **10-minute TTL**. `TransactionStatus.EXPIRED = "expired"` is a
distinct status (not `cancelled`/`failed`). Two mechanisms flip an overdue
`pending` deposit to `expired`:

- **Lazy** — `getWalletTransactionById` (the `GET /wallet/transactions/:id`
  poll target) calls `walletRepository.expireIfDue(id, now)` when the record is
  `pending` and `expires_at <= now`, so the FE (polling every 3s) sees `expired`
  within ~3s.
- **Cron backstop** — `wallet-deposit-expiration.job.ts` runs every minute
  (`withJobLock`), calling `walletService.expirePendingDeposits()` →
  `walletRepository.expirePendingDeposits(now)` (`updateMany`).

Both expire methods guard `expires_at: { $ne: null, $lte: now }`. Because
**only `createDepositTransaction` sets `expires_at`** (pricing payments leave it
null), pricing QR payments are never expired by either path. Index
`{ status: 1, expires_at: 1 }` backs the cron scan.

**Money-safety:** expiry does NOT prevent late payment from crediting. The
webhook (`findByPaymentCode` — no status filter; `finalizeSePayDepositIfPending`
CAS `{ status: { $ne: SUCCESS } }`) still finalizes an `expired` deposit to
`success` and credits atomically if the transfer arrives late. `expired` only
affects the QR/UI.

FE: `wallet-deposit-page.tsx` shows a mm:ss countdown from `expires_at`; on
expiry it hides the QR and shows a "Tạo QR mới" (regenerate) button that
re-creates the deposit with the same amount. Poll stops when status leaves
`pending`. `expired` renders a distinct label (`statusExpired` / "Hết hạn") and
`TimerOff` icon in the wallet surfaces.

## Pricing QR Payment Flow

Pricing QR purchase uses wallet transaction infrastructure but is triggered from
pricing service/controller.

`UserWalletService.createPricingPayment(userId, request)`:

Input:

| Field | Meaning |
| --- | --- |
| `target_plan_code` | Must be `gold` or `diamond`; not `standard`. |
| `duration_months` | Number of months requested. |

Flow:

1. Validate target plan code.
2. Load user.
3. Ensure default pricing packages exist.
4. Load active `PricingPackage` from DB.
5. Compute amount as `package.price * duration_months`.
6. Generate payment code and QR URL.
7. Create `WalletTransaction`:
   - `type: deposit`,
   - `status: pending`,
   - `gateway: sepay`,
   - `purpose: pricing_upgrade`,
   - `purpose_metadata: { target_plan_code, duration_months }`.
8. Return QR/payment info plus package display name.

Webhook behavior:

- The webhook credits the wallet balance first.
- If transaction has `purpose = pricing_upgrade`, it asynchronously calls
  `pricingService.upgradePricing`.
- Idempotency key is `qr-pay:<transactionId>`.
- A plan-activated notification is sent on success.

Important nuance: pricing QR transactions are still stored as `deposit`
transactions. The `purpose` field tells the app that the successful deposit is
also intended to upgrade a plan.

## SePay Webhook Flow

`POST /api/wallet/deposit/webhook`.

Validation:

- `id`: positive number.
- `gateway`: string.
- `transactionDate`: string.
- `accountNumber`: string.
- `code`: nullable string.
- `content`: string.
- `transferType`: `in` or `out`.
- `transferAmount`: nonnegative integer.
- `accumulated`: nonnegative number.
- `subAccount`: nullable string.
- `referenceCode`: string.
- `description`: string.

Flow:

1. Ignore non-incoming transfers and return success status
   `ignored_non_incoming`.
2. Resolve payment code from:
   - webhook `code`, or
   - regex match in `content` or `description`.
3. If no payment code, return `ignored_missing_payment_code`.
4. Check if SePay transaction id already exists and is successful:
   return `already_processed`.
5. Find transaction by existing SePay id or payment code.
6. If transaction not found, return `ignored_transaction_not_found`.
7. If transaction already success, return `already_processed`.
8. If transfer amount does not match transaction amount:
   - apply webhook metadata,
   - mark transaction `failed`,
   - send wallet deposit failed notification,
   - return `amount_mismatch`.
9. Start Mongo session transaction.
10. Atomically finalize wallet transaction from non-success to success.
11. Atomically credit wallet balance.
12. End session.
13. Send wallet deposit success notification.
14. If purpose is `pricing_upgrade`, trigger pricing activation.
15. Return processed response with balance.

Idempotency protections:

- Atomic compare-and-set update from status != success to success.
- Partial unique index on `sepay_transaction_id`.
- Duplicate key handling returns already processed.

## Balance Calculation

Normal path:

- `wallet.balance` is read from the denormalized wallet document.
- `atomicCredit` upserts and increments balance.
- `atomicDeduct` decrements only if `balance >= amount`.

Fallback:

- If wallet row is missing, balance is calculated from successful transactions:
  - `deposit` and `refund` add,
  - `withdraw` and `payment` subtract.

Balance is clamped at minimum 0.

## Transaction History

User history:

- Route: `GET /api/wallet/transactions`.
- Filters: `type`, `status`, `start_date`, `end_date`.
- User id is forced to the authenticated user.
- Sorted `created_at: -1`.

Transaction detail:

- Route: `GET /api/wallet/transactions/:transactionId`.
- Validates ObjectId.
- Transaction must belong to current user.

Admin history:

- Route: `GET /api/admin/wallet/transactions`.
- Filters include `user_id`, `type`, `status`, `start_date`, `end_date`.
- Populates `user_id`.

## Admin Analytics

`AdminWalletService` maps preset date ranges to `startDate` and `endDate` using
Day.js.

Endpoints:

- stats: aggregate transaction amount/count by type/status.
- top-users: top users by successful transaction activity, limited to 5.
- chart: time series data for transaction totals.

Check repository aggregation before changing chart semantics.

## Notifications

Wallet event notification types:

- `wallet.deposit_success`
- `wallet.deposit_failed`

Pricing activation currently reuses wallet event helper with type
`wallet.deposit_success`, but title/body keys are plan activation specific.

Wallet reconciliation alerts:

- Sent to first admin.
- Type: `security.alert`.
- Channels: in-app and email.
- Dedupe key per day.

## Frontend Surfaces

User wallet:

- `/wallet`
- `/wallet/deposit`
- `/client/wallet`
- `/client/wallet/deposit`
- `components/wallet/wallet-page.tsx`
- `components/wallet/wallet-deposit-page.tsx`
- `services/wallet.service.ts`
- `lib/hooks/use-wallet.ts`

Admin wallet:

- `/dashboard/transactions`
- `services/admin-wallet.service.ts`
- `lib/hooks/use-admin-transactions.ts`

Currency:

- Wallet amounts are VND base amounts.
- Some dashboard views display through `useCurrency`, but transaction currency
  field currently defaults to `VND`.

## Common Implementation Checklist

When changing wallet behavior:

1. Decide whether the transaction should affect balance.
2. Use atomic wallet operations for balance changes.
3. Keep webhook idempotency intact.
4. Store gateway payload and SePay metadata for audit.
5. Do not process outgoing SePay transfers as deposits.
6. Keep amount mismatch behavior as failed transaction.
7. If introducing a new purpose, document webhook side effects.
8. Update admin aggregations if transaction type semantics change.
9. Update account deletion blockers if balance semantics change.

## Known Implementation Nuances

- Pricing QR payment creates a `deposit` transaction with
  `purpose: pricing_upgrade`; do not model it as a separate payment unless the
  pricing activation flow is updated.
- Webhook returns `success: true` for ignored events so SePay does not retry
  irrelevant transfers forever.
- QR generation requires `SEPAY_BANK_ACCOUNT_NUMBER` and `SEPAY_BANK_NAME`.
- `payment_code` regex fallback expects the configured prefix plus 3-10
  digits, while generated default suffix is 10 digits.
- The booking module docs should not claim wallet escrow exists unless booking
  fund hold/release is actually implemented.
