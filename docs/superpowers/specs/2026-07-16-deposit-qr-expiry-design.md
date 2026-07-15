# QR nạp ví hết hạn sau 10 phút

**Ngày:** 2026-07-16
**Trạng thái:** Đã duyệt thiết kế, chờ lập plan

## Bối cảnh & mục tiêu

Khi user tạo QR nạp ví (SePay), hệ thống đã insert một `wallet_transaction`
`pending` kèm QR URL ([user-wallet.service.ts](../../SERVER/src/services/wallet/user-wallet.service.ts)
`createDepositTransaction`). Hiện QR **không có thời hạn** — record nằm `pending`
mãi tới khi webhook về. Cần: QR có hạn **10 phút**; quá hạn thì đổi trạng thái
sang `expired` và UI cho tạo QR mới.

## Quyết định chốt (từ brainstorm)

1. **Tiền về trễ vẫn cộng**: nếu webhook SePay về sau khi đã `expired`, vẫn khớp
   `payment_code` và cộng tiền (chuyển `expired`→`success`). Money-safe.
2. **Status mới `expired`** (không tái dùng `cancelled`/`failed`).
3. **Cron + lazy-expire**: cron mỗi phút là backstop; lazy-expire khi FE poll
   `GET /wallet/transactions/:id` để UI phản ứng trong ~3s.
4. **Có FE**: đếm ngược + nút tạo lại QR.
5. **Phạm vi**: chỉ áp cho **deposit nạp ví** (`createDepositTransaction`).
   `createPricingPayment` KHÔNG set `expires_at` → cron/lazy (lọc theo
   `expires_at`) tự động bỏ qua pricing. Luồng mua gói không đổi.

## Money-safety (đã xác minh, KHÔNG cần sửa webhook)

- `walletRepository.findByPaymentCode` không lọc theo status → vẫn tìm ra record
  `expired`.
- `finalizeSePayDepositIfPending` CAS `{ status: { $ne: SUCCESS } }` → `SUCCESS`,
  nên `expired` vẫn được finalize và cộng tiền atomically.
- Amount-mismatch vẫn set `failed` như cũ.

→ Webhook giữ nguyên. `expired` chỉ là trạng thái trung gian ảnh hưởng UI/QR.

## Backend

### Constants / enum
- `SERVER/src/constants/wallet.ts`: `TransactionStatus.EXPIRED = "expired"`;
  `WALLET_LIMITS.DEPOSIT_QR_TTL_MINUTES = 10`.

### Model
- `wallet-transaction.model.ts`: thêm `expires_at: { type: Date, default: null }`.
  Index mới `{ status: 1, expires_at: 1 }` cho cron quét.

### Tạo deposit
- `CreateTransactionInput` (repo): thêm `expires_at?: Date`.
- `createDepositTransaction`: set `expires_at = new Date(Date.now() +
  DEPOSIT_QR_TTL_MINUTES*60_000)`, truyền vào `walletRepository.create`, và trả
  về trong response.
- `CreateDepositResponse` (types): thêm `expires_at: string` (ISO). Vì
  `CreatePricingPaymentResponse extends CreateDepositResponse`, để field
  **optional hoặc** trả `expires_at` chỉ ở deposit — chọn: field bắt buộc trong
  CreateDepositResponse, pricing set `expires_at: ""`/bỏ (điều chỉnh type để
  không vỡ). Đơn giản nhất: `expires_at?: string`.

### Expire mechanism
- Repository:
  - `expirePendingDeposits(now: Date): Promise<number>` — `updateMany({ status:
    PENDING, expires_at: { $ne: null, $lte: now } }, { $set: { status: EXPIRED,
    updated_at: now } })`, trả `modifiedCount`.
  - `expireIfDue(transactionId: string, now: Date): Promise<IWalletTransactionDocument | null>`
    — `findOneAndUpdate({ _id, status: PENDING, expires_at: { $ne: null, $lte:
    now } }, { $set: { status: EXPIRED, updated_at: now } }, { new: true })`.
    Trả record đã đổi, hoặc null nếu không đủ điều kiện.
- Service:
  - `expirePendingDeposits()` → gọi repo, log số lượng.
  - `getWalletTransactionById`: sau check ownership, nếu `status === PENDING &&
    expires_at && expires_at <= now` → `const expired = await
    expireIfDue(id, now)`; return `expired ?? transaction`.
- Cron `SERVER/src/jobs/wallet-deposit-expiration.job.ts`: `cron.schedule("* * * *
  *")`, `withJobLock("wallet-deposit-expiration", { ttlMs })`, gọi
  `userWalletService.expirePendingDeposits()`. Có `start*`/`stop*` như các job
  khác; đăng ký trong `src/index.ts` bootstrap + graceful shutdown.

## Frontend

### Types / service
- `services/wallet.service.ts`: `CreateDepositResponse.expires_at?: string`;
  transaction status union thêm `"expired"`; transaction type thêm
  `expires_at?: string | null`.

### Polling
- `useWalletTransaction` giữ nguyên: poll 3s khi `pending`, dừng khi khác →
  `expired` tự dừng poll.

### Deposit page (`components/wallet/wallet-deposit-page.tsx`)
- **Đếm ngược** mm:ss từ `expires_at` của payment (fallback: từ transaction
  detail). Cập nhật mỗi giây bằng `setInterval`.
- Khi `transactionStatus === "expired"` **hoặc** đếm ngược ≤ 0: ẩn QR, hiện
  thông báo "QR đã hết hạn" + nút **"Tạo QR mới"** → gọi lại mutation tạo deposit
  với cùng `amount` (regenerate); reset đếm ngược theo `expires_at` mới.
- i18n: thêm keys (`qrCountdown`, `qrExpiredTitle`, `qrExpiredMsg`,
  `regenerateQr`) vào cả 4 file `messages/{vi,en,zh,ko}.json`.

## Ngoài phạm vi (YAGNI)
- Không áp expiry cho pricing payment.
- Không gửi notification khi expire (chỉ đổi status).
- Không thay đổi logic cộng tiền webhook.

## Kiểm thử
- BE unit (mock repo): `getWalletTransactionById` lazy-expire khi quá hạn (trả
  `expired`); không đổi khi chưa quá hạn; không đụng record không phải PENDING.
  `expirePendingDeposits` trả count; guard `expires_at != null` để loại pricing.
- BE: webhook về sau expired → vẫn `success` + cộng tiền (đã có path; thêm test
  nếu khả thi với mock).
- FE (typecheck + chạy tay): countdown chạy; hết hạn hiện nút; tạo QR mới đổi QR
  + reset đồng hồ; 4 ngôn ngữ không vỡ layout.
