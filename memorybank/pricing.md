# Memory Bank - Pricing Plans and Subscriptions

## Purpose

The pricing module manages subscription packages for users/workers. Packages
control platform features such as messaging CTA availability, job/post creation
quota, boost availability metadata, and ad display flags. Users buy or renew a
plan for a number of months, and the active plan is stored on the user profile.

Runtime pricing is database-backed. Do not treat
`SERVER/src/constants/pricing.ts` prices as the current live prices. Those
constants are bootstrap defaults only. The live package price, display name,
active flag, and feature limits come from the `PricingPackage` collection and
can be changed from the admin dashboard.

Primary source files:

- Constants/defaults: `SERVER/src/constants/pricing.ts`
- Package model: `SERVER/src/models/pricing/pricing-package.model.ts`
- History model: `SERVER/src/models/pricing/user-subscription-history.model.ts`
- Service: `SERVER/src/services/pricing/pricing.service.ts`
- Routes: `SERVER/src/routes/pricing/pricing.routes.ts`
- Validation: `SERVER/src/validations/pricing/pricing.validation.ts`
- Wallet QR payment bridge: `SERVER/src/services/wallet/user-wallet.service.ts`
- Frontend pricing API: `pr1as-client/services/pricing.service.ts`
- Frontend pricing hooks: `pr1as-client/lib/hooks/use-pricing.ts`
- Public pricing UI: `pr1as-client/app/pricing/page.tsx` and
  `pr1as-client/components/pricing/pricing-plans.tsx`
- Admin pricing UI: `pr1as-client/app/dashboard/pricing/page.tsx`

## Plan Codes and Rank

Plan codes are fixed enum values:

```ts
standard
gold
diamond
```

Rank from `PRICING_PLAN_RANK`:

| Plan | Rank | Meaning |
| --- | ---: | --- |
| `standard` | 0 | Default/free baseline plan. |
| `gold` | 1 | Paid mid-tier plan. |
| `diamond` | 2 | Paid top-tier plan. |

Rank affects upgrade/downgrade rules. Users can renew the same paid plan or
upgrade to a higher paid plan. They cannot buy `standard`, and they cannot
downgrade from a higher active plan through the purchase API. Downgrade happens
only by expiration or admin/user-data intervention outside this flow.

## Database Source of Truth

Collection: `pricing_package`.

Model: `SERVER/src/models/pricing/pricing-package.model.ts`.

Fields:

| Field | Meaning |
| --- | --- |
| `package_code` | Unique enum code: `standard`, `gold`, or `diamond`. |
| `display_name` | Admin-editable display name, max 100 chars. |
| `price` | Monthly package price in VND. |
| `is_active` | Whether package is visible/available for public purchase. |
| `features` | Feature gates and limits. |
| `created_at`, `updated_at` | Manual timestamps. |

Feature fields:

| Feature | Type | Meaning |
| --- | --- | --- |
| `messaging_enabled` | boolean | Enables messaging CTA in worker profile UI for the current user's plan. |
| `messaging_max_recipients` | number or null | Intended recipient limit. `null` means unlimited when enabled. |
| `create_job_enabled` | boolean | Allows creating posts/jobs. |
| `create_job_limit` | number or null | Monthly post/job creation limit. `null` means unlimited when enabled. |
| `boost_profile_enabled` | boolean | Indicates plan supports profile boosting. |
| `boost_profile_monthly_limit` | number or null | Intended monthly boost count limit. `null` means unlimited when enabled. |
| `ads_enabled` | boolean | Whether ads are enabled for the plan. Public UI shows "no ads" when false. |

Normalization rule:

- If a feature is disabled, its paired limit is normalized to `null`.
- If a feature is enabled and the limit is `null`, the limit is treated as
  unlimited by UI/service code that supports unlimited limits.

## Bootstrap Defaults vs Live Values

`SERVER/src/constants/pricing.ts` contains:

- `PricingPlanCode`
- `PricingPlanFeatures`
- `PRICING_PLAN_RANK`
- `PRICING_PLAN_MONTHLY_PRICE`
- `DEFAULT_PRICING_PLAN_FEATURES`

The default monthly prices currently in constants are:

| Plan | Bootstrap default only |
| --- | ---: |
| `standard` | 0 VND |
| `gold` | 199000 VND |
| `diamond` | 399000 VND |

Important: these are not the live source of truth after the app has bootstrapped
or an admin has edited packages.

`pricingService.ensureDefaultPackages()`:

1. Upserts one package for each plan code if missing.
2. Uses default display name, default price, and default features only on
   insert.
3. Backfills price only for records where price is missing or null.
4. Does not overwrite an existing admin-edited price or features.

Implication for docs and code:

- Use DB packages for current package price/features.
- Use constants only for enum/rank/default fallback/bootstrap behavior.
- Do not hard-code `199000` or `399000` into product logic or memory-bank
  descriptions as live pricing.

## User Subscription State

Current plan is stored on the user:

```ts
User.meta_data.pricing_plan_code
User.meta_data.pricing_started_at
User.meta_data.pricing_expires_at
```

Defaults:

- `pricing_plan_code` defaults to `standard`.
- `pricing_started_at` and `pricing_expires_at` are null for the free/default
  state.

`GET /api/pricing/me` returns:

```ts
{
  plan_code: PricingPlanCode,
  started_at: Date | null,
  expires_at: Date | null,
  is_expired: boolean,
  package: PricingPackage,
}
```

Before returning, the service:

1. Ensures default packages exist.
2. Checks whether the current user's paid plan is expired.
3. Downgrades expired paid plans to `standard`.
4. Returns the active DB package for the user's plan.

If the current user's package is inactive, `getMyPricing` falls back to the
standard package document for the returned package object.

## Subscription History

Collection: `user_subscription_history`.

Model: `SERVER/src/models/pricing/user-subscription-history.model.ts`.

Fields:

| Field | Meaning |
| --- | --- |
| `user_id` | Subscriber. |
| `from_plan_code` | Plan before event. |
| `to_plan_code` | Plan after event. |
| `event_type` | `upgrade`, `renewal`, or `expired_downgrade`. |
| `status` | `success` or `failed`. Current successful flows write `success`. |
| `source` | `wallet` or `system`. |
| `amount` | Amount paid in VND; expiration writes 0. |
| `currency` | Defaults to `VND`. |
| `started_at` | Effective plan start. |
| `expires_at` | Effective plan expiry. |
| `idempotency_key` | Optional idempotency key for duplicate protection. |
| `metadata` | Extra event data such as duration or wallet transaction id. |
| `created_at` | Event timestamp. |

Indexes:

- `user_id + created_at`
- Sparse unique `user_id + idempotency_key`

## Purchase Paths

There are two backend purchase paths.

### Direct Wallet Upgrade

Route: `POST /api/pricing/upgrade`

Middleware:

- `authenticate`
- CSRF protection

Payload:

```ts
{
  target_plan_code: "gold" | "diamond",
  duration_months?: number,    // 1..24, default 1
  idempotency_key?: string,    // 8..128 chars
}
```

Rules:

- Target cannot be `standard`.
- Target package must exist and be active in `PricingPackage`.
- Buying the same paid plan is a renewal.
- Buying a higher rank paid plan is an upgrade.
- Buying a lower rank plan while already on a higher paid plan is rejected.
- Amount = `targetPackage.price * duration_months`.
- User must have enough wallet balance.

Transaction behavior:

All core state changes run inside one MongoDB session/transaction:

1. Atomically deduct wallet balance.
2. Create a wallet transaction of type `payment` with status `success`.
3. Update `User.meta_data.pricing_*`.
4. Insert `UserSubscriptionHistory`.

If any of those fail, the transaction rolls back.

Renewal vs upgrade expiry behavior:

| Scenario | Start date | Expiry date |
| --- | --- | --- |
| Renew same active plan | Keep existing `pricing_started_at` if present. | Add purchased months to current future `expires_at`. |
| Same plan but already expired | Starts now after active-plan check downgrades. | Now + purchased months. |
| Upgrade to higher plan | Starts now. | Now + purchased months. |

Upgrade nuance:

- Upgrading to a higher plan forfeits remaining time on the old plan.
- There is no prorating logic.

Idempotency:

- If `idempotency_key` already exists for a successful event for that user, the
  service returns current pricing state instead of charging again.
- Duplicate insert conflicts on the sparse unique index are also treated as
  idempotent success.

Boost-point side effect:

- After the pricing transaction commits, the service awards boost points for
  Gold/Diamond purchases using boost config:
  - Gold uses `gold_package_points`.
  - Diamond uses `diamond_package_points`.
- Point awarding is outside the pricing transaction. A point-award failure logs
  a warning but does not roll back the plan purchase.

### QR / SePay Pricing Purchase

Route: `POST /api/pricing/buy`

Middleware:

- `authenticate`
- CSRF protection

Payload:

```ts
{
  target_plan_code: "gold" | "diamond",
  duration_months?: number // 1..24, default 1
}
```

Flow:

1. Validates target is not `standard`.
2. Ensures default packages exist.
3. Loads active target package from DB.
4. Amount = `targetPackage.price * duration_months`.
5. Creates a pending wallet transaction:
   - `type: deposit`
   - `status: pending`
   - `gateway: sepay`
   - `purpose: "pricing_upgrade"`
   - `purpose_metadata: { target_plan_code, duration_months }`
6. Returns QR URL, bank account details, payment code/content, amount, plan, and
   duration.

Webhook activation:

- SePay webhook credits the pending deposit when matching payment code and
  amount are processed by wallet service.
- If the transaction purpose is `pricing_upgrade`, wallet service calls:

```ts
pricingService.upgradePricing(userId, {
  target_plan_code,
  duration_months,
  idempotency_key: `qr-pay:${transactionId}`,
})
```

This means the QR path first credits the wallet from the bank transfer and then
uses the normal pricing upgrade path to deduct that credited balance and
activate the plan.

Failure nuance:

- If wallet credit succeeds but plan activation later fails, the user may keep
  the credited balance and the failure is logged. Investigate webhook logs and
  subscription history in that case.

Frontend QR purchase:

- Public pricing UI uses `useBuyPricing`.
- On buy, it opens `PricingPurchaseModal`.
- The modal displays QR image, bank name, account number, amount, and transfer
  content.
- It polls the wallet transaction by `transaction_id`.
- On success, it invalidates pricing, auth, and wallet query caches.

## Expiration and Downgrade

Scheduled job:

- File: `SERVER/src/jobs/plan-expiration.job.ts`
- Cron: `5 * * * *` (hourly at minute 5)
- Lock name: `plan-expiration`
- Lock TTL: 10 minutes

Job behavior:

1. Finds users whose plan is not `standard` and whose
   `meta_data.pricing_expires_at` is in the past.
2. Updates their plan to `standard`.
3. Clears started/expires timestamps.
4. Writes `UserSubscriptionHistory` event:
   - `event_type: expired_downgrade`
   - `source: system`
   - `amount: 0`
   - `metadata.reason: "expired"`

Request-path expiration:

- `pricingService.ensureUserPlanActive(userId)` also downgrades an expired paid
  plan before `GET /pricing/me` and before purchases.
- This keeps a user's displayed plan from staying stale between hourly job runs.

## Admin Package Management

Routes under `/api/pricing/packages/admin`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/packages/admin` | List all packages, active and inactive. |
| `POST` | `/packages/admin` | Create a package for a plan code. |
| `GET` | `/packages/admin/:id` | Read one package. |
| `PATCH` | `/packages/admin/:id` | Update display name, price, active flag, or features. |
| `DELETE` | `/packages/admin/:id` | Delete package document. |

Admin validation:

- `package_code` must be one of `standard`, `gold`, `diamond`.
- `display_name` is required on create and max 100 chars.
- `price` must be `>= 0`.
- `is_active` defaults to true on create.
- Feature limits:
  - `messaging_max_recipients`: positive int or null.
  - `create_job_limit`: positive int or null.
  - `boost_profile_monthly_limit`: int >= 0 or null.

Admin UI:

- Page: `/dashboard/pricing`
- Hook: `useAdminPricingPackages`.
- Current UI edits existing packages only; it does not expose create/delete.
- Admin can edit:
  - display name
  - VND monthly price
  - active/inactive switch
  - messaging enabled and recipient limit
  - job/post creation enabled and monthly limit
  - boost enabled and monthly limit
  - ads enabled flag

Operational notes:

- Because `ensureDefaultPackages()` recreates missing default plan documents,
  deleting a package may not be permanent. Prefer updating or deactivating over
  delete unless the behavior is intentional.
- Deactivating a paid package removes it from public package list and makes it
  unavailable for new purchases.

## Public Pricing UI

Public page:

- Route: `pr1as-client/app/pricing/page.tsx`
- Fetches `pricingService.getPublicPackages()`.
- Sorts packages by live DB price.
- Formats price with frontend currency preference for display.
- Uses package feature fields from DB for comparison rows.

Interactive plan cards:

- Component: `pr1as-client/components/pricing/pricing-plans.tsx`
- Guests:
  - Standard CTA goes to register.
  - Paid plan CTA goes to login with `next=/pricing`.
- Authenticated users:
  - Current plan button disabled.
  - Lower-rank plan button disabled.
  - Standard/free button disabled.
  - Paid higher plan opens QR purchase flow.

Current plan detection:

- Uses `useMyPricing()` when available.
- Falls back to auth-store `user.meta_data.pricing_plan_code` while pricing data
  is loading.

## Feature Gating in Current Code

DB-backed feature usage:

| Feature | Current code path |
| --- | --- |
| `create_job_enabled`, `create_job_limit` | Backend post creation quota in `SERVER/src/services/post/post.service.ts`. |
| `messaging_enabled` | Frontend worker profile messaging CTA in `components/worker/worker-services.tsx`. |
| `boost_profile_enabled`, `boost_profile_monthly_limit` | Exposed in pricing/admin UI. Current boost spending service itself is point-based. |
| `ads_enabled` | Displayed in pricing comparison as ad/no-ad feature. |

Post/job creation quota:

- Before creating a post, backend loads current user's active DB package.
- User must have last active role `client`.
- User reputation must be at least 30.
- `create_job_enabled=false` rejects post creation.
- `create_job_limit=null` means unlimited.
- Otherwise backend counts posts created by the author in the current month and
  rejects when count reaches the limit.

Messaging nuance:

- Worker profile CTA checks current user's pricing package feature
  `messaging_enabled`.
- Backend direct chat currently authorizes direct messaging by confirmed booking
  relationship and role pairing, not by `PricingPackage.messaging_enabled`.
- If product requirements need pricing to enforce chat at the API level, add a
  DB-backed pricing check in chat service or middleware. Do not rely only on the
  frontend CTA.

Legacy/static helper nuance:

- `SERVER/src/utils/pricing-plan.helper.ts` resolves features from
  `DEFAULT_PRICING_PLAN_FEATURES`.
- `SERVER/src/middleware/plan.ts` uses that helper.
- Current route usage appears to rely mainly on direct DB package lookups in
  service code, especially post creation and pricing purchase.
- For new feature gates that must honor admin-edited package settings, prefer
  loading the active `PricingPackage` from DB instead of using the static helper.

## API Surface

Routes under `/api/pricing`:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/packages` | Public | List active DB packages. |
| `GET` | `/me` | Authenticated | Current user's plan, expiry, and package. |
| `POST` | `/upgrade` | Authenticated + CSRF | Direct wallet-balance purchase/renewal/upgrade. |
| `POST` | `/buy` | Authenticated + CSRF | Create SePay QR payment for a plan. |
| `GET` | `/packages/admin` | Admin | List all packages. |
| `POST` | `/packages/admin` | Admin | Create a package. |
| `GET` | `/packages/admin/:id` | Admin | Package detail. |
| `PATCH` | `/packages/admin/:id` | Admin | Update package. |
| `DELETE` | `/packages/admin/:id` | Admin | Delete package. |

## Currency Rules

- Package prices are stored in VND in `PricingPackage.price`.
- Wallet payment amounts are VND.
- Admin price input is VND.
- Public pricing page can display converted values using frontend currency
  preference, but purchase/payment still uses VND amount from DB.
- Multi-currency worker service pricing is separate from subscription package
  pricing. See `memorybank/multi-currency.md`.

## Common Implementation Checklist

When changing pricing behavior:

1. Decide whether the change is a bootstrap default or live DB package behavior.
2. If it is live behavior, read/update `PricingPackage`, not only constants.
3. Keep `PricingPlanCode` enum and rank consistent across backend/frontend.
4. Preserve `duration_months` validation range 1..24 unless product changes it.
5. Keep wallet changes and user pricing changes in one transaction for direct
   wallet upgrades.
6. Use idempotency keys for QR/webhook-triggered activation.
7. Invalidate frontend pricing, auth, and wallet caches after purchase success.
8. If adding a new feature gate, document whether enforcement is frontend-only,
   backend-only, or both.

## Known Implementation Nuances

- Constants still contain default price values, but DB packages are the runtime
  source of truth.
- Admin package create/delete routes exist, but the dashboard currently focuses
  on editing existing default packages.
- `POST /pricing/upgrade` and QR webhook activation both use wallet balance
  deduction through `upgradePricing`.
- QR pricing purchase creates a wallet deposit first; activation then deducts
  that balance for the plan. A failed activation after deposit can leave wallet
  balance credited.
- `boost_profile_monthly_limit` is modeled and displayed, but boost activation
  currently spends worker points and checks active boost state, not this monthly
  package limit.
- `messaging_enabled` is enforced in the worker profile CTA, while backend chat
  authorization currently depends on confirmed booking relationship.

