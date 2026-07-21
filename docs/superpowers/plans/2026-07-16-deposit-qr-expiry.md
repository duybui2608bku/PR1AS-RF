# Deposit QR Expiry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** QR nạp ví SePay hết hạn sau 10 phút — pending deposit quá hạn chuyển sang `expired` (cron + lazy), FE hiện đếm ngược và nút tạo QR mới; tiền về trễ vẫn cộng.

**Architecture:** Thêm status `expired` + field `expires_at` cho wallet transaction. `createDepositTransaction` set `expires_at = now + 10p`. Repo có `expirePendingDeposits` (cron backstop) + `expireIfDue` (lazy khi FE poll `GET /wallet/transactions/:id`). Webhook không đổi (đã money-safe). FE thêm countdown + expired-state + regenerate.

**Tech Stack:** Node + Express + TS + Mongoose (jest unit tests, mock repositories); Next.js + React + TanStack Query; i18n next-intl (4 locales).

## Global Constraints

- Backend responses qua helper `R`; tsconfig strict + noUnusedLocals/noUnusedParameters/noImplicitReturns.
- Frontend: KHÔNG semicolons; Tailwind only; `const` arrow functions có type; early returns; handlers prefix `handle*`; accessibility attrs.
- Phạm vi expiry: CHỈ `createDepositTransaction` (nạp ví). `createPricingPayment` KHÔNG set `expires_at` → cron/lazy lọc `expires_at != null` nên pricing không bị đụng.
- Money-safe: webhook giữ nguyên. `findByPaymentCode` không lọc status; `finalizeSePayDepositIfPending` CAS `{ status: { $ne: SUCCESS } }` → tiền về sau `expired` vẫn cộng.
- TTL = 10 phút. i18n: thêm keys vào cả 4 file `messages/{vi,en,zh,ko}.json`.
- Commits: Conventional Commits, imperative, no trailing period.

---

## File Structure

**Backend**
- Modify `SERVER/src/constants/wallet.ts` — `TransactionStatus.EXPIRED`, `WALLET_LIMITS.DEPOSIT_QR_TTL_MINUTES`.
- Modify `SERVER/src/models/wallet/wallet-transaction.model.ts` — `expires_at` field + index.
- Modify `SERVER/src/repositories/wallet/wallet.repository.ts` — `CreateTransactionInput.expires_at`, `expirePendingDeposits`, `expireIfDue`.
- Modify `SERVER/src/types/wallet/wallet.types.ts` — `CreateDepositResponse.expires_at`.
- Modify `SERVER/src/services/wallet/user-wallet.service.ts` — set `expires_at` on create + return it; lazy-expire in `getWalletTransactionById`; `expirePendingDeposits`.
- Create `SERVER/src/services/wallet/user-wallet.expiry.test.ts` — unit test lazy-expire.
- Create `SERVER/src/jobs/wallet-deposit-expiration.job.ts` — cron.
- Modify `SERVER/src/index.ts` — start/stop job.

**Frontend**
- Modify `pr1as-client/services/wallet.service.ts` — status union `"expired"`, `WalletTransaction.expires_at`, `DepositPayment.expires_at`.
- Modify `pr1as-client/components/wallet/wallet-deposit-page.tsx` — countdown, expired state, regenerate.
- Modify `pr1as-client/messages/{vi,en,zh,ko}.json` — `Wallet` keys.

---

## Task 1: Backend — enum, constant, model field, input type

**Files:**
- Modify: `SERVER/src/constants/wallet.ts`
- Modify: `SERVER/src/models/wallet/wallet-transaction.model.ts`
- Modify: `SERVER/src/repositories/wallet/wallet.repository.ts`

**Interfaces:**
- Produces: `TransactionStatus.EXPIRED = "expired"`; `WALLET_LIMITS.DEPOSIT_QR_TTL_MINUTES = 10`; model field `expires_at: Date | null`; `CreateTransactionInput.expires_at?: Date`.

- [ ] **Step 1: Enum + constant** — `SERVER/src/constants/wallet.ts`

Trong `enum TransactionStatus` thêm sau `CANCELLED`:
```ts
  EXPIRED = "expired",
```
Trong `WALLET_LIMITS` (object hằng số) thêm:
```ts
  DEPOSIT_QR_TTL_MINUTES: 10,
```
(Nếu `WALLET_LIMITS` dùng `as const`/kiểu cụ thể, thêm field đúng chỗ, giữ format.)

- [ ] **Step 2: Model field + index** — `wallet-transaction.model.ts`

Thêm field (đặt gần `qr_url`/`payment_code`):
```ts
    expires_at: {
      type: Date,
      default: null,
    },
```
Thêm index (cạnh các `walletTransactionSchema.index(...)` khác):
```ts
walletTransactionSchema.index({ status: 1, expires_at: 1 });
```

- [ ] **Step 3: Input type** — `wallet.repository.ts`

Trong `interface CreateTransactionInput` thêm:
```ts
  expires_at?: Date;
```

- [ ] **Step 4: Typecheck**

Run: `cd SERVER && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add SERVER/src/constants/wallet.ts SERVER/src/models/wallet/wallet-transaction.model.ts SERVER/src/repositories/wallet/wallet.repository.ts
git commit -m "feat(wallet): add expired status and expires_at to wallet transaction"
```

---

## Task 2: Backend — repo expire methods + set expires_at on deposit create

**Files:**
- Modify: `SERVER/src/repositories/wallet/wallet.repository.ts`
- Modify: `SERVER/src/types/wallet/wallet.types.ts`
- Modify: `SERVER/src/services/wallet/user-wallet.service.ts`

**Interfaces:**
- Consumes: `CreateTransactionInput.expires_at` (Task 1), `TransactionStatus.EXPIRED`, `WALLET_LIMITS.DEPOSIT_QR_TTL_MINUTES`.
- Produces:
  - `walletRepository.expirePendingDeposits(now: Date): Promise<number>`
  - `walletRepository.expireIfDue(transactionId: string, now: Date): Promise<IWalletTransactionDocument | null>`
  - `CreateDepositResponse.expires_at?: string`
  - `createDepositTransaction` returns `expires_at` (ISO) and persists it.

- [ ] **Step 1: Repo methods** — `wallet.repository.ts`

Thêm 2 method vào class (cạnh `findByPaymentCode`). `WalletTransaction`, `TransactionStatus` đã import sẵn.
```ts
async expirePendingDeposits(now: Date): Promise<number> {
  const result = await WalletTransaction.updateMany(
    {
      status: TransactionStatus.PENDING,
      expires_at: { $ne: null, $lte: now },
    },
    { $set: { status: TransactionStatus.EXPIRED, updated_at: now } }
  );
  return result.modifiedCount ?? 0;
}

async expireIfDue(
  transactionId: string,
  now: Date
): Promise<IWalletTransactionDocument | null> {
  return WalletTransaction.findOneAndUpdate(
    {
      _id: transactionId,
      status: TransactionStatus.PENDING,
      expires_at: { $ne: null, $lte: now },
    },
    { $set: { status: TransactionStatus.EXPIRED, updated_at: now } },
    { new: true }
  );
}
```

- [ ] **Step 2: Response type** — `wallet.types.ts`

Trong `interface CreateDepositResponse` thêm:
```ts
  expires_at?: string;
```
(Optional để không phá `CreatePricingPaymentResponse extends CreateDepositResponse`.)

- [ ] **Step 3: Set expires_at khi tạo deposit** — `user-wallet.service.ts` `createDepositTransaction`

Trước `walletRepository.create(...)`, tính:
```ts
const expiresAt = new Date(
  Date.now() + WALLET_LIMITS.DEPOSIT_QR_TTL_MINUTES * 60_000
);
```
Thêm `expires_at: expiresAt,` vào object truyền cho `walletRepository.create(...)`.
Thêm `expires_at: expiresAt.toISOString(),` vào object `return { ... }`.
Đảm bảo `WALLET_LIMITS` đã được import trong file (đã dùng `WALLET_LIMITS.MAX_DEPOSIT_AMOUNT` nên có sẵn). KHÔNG sửa `createPricingPayment`.

- [ ] **Step 4: Typecheck**

Run: `cd SERVER && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add SERVER/src/repositories/wallet/wallet.repository.ts SERVER/src/types/wallet/wallet.types.ts SERVER/src/services/wallet/user-wallet.service.ts
git commit -m "feat(wallet): set deposit QR expiry and add expire repository methods"
```

---

## Task 3: Backend — service lazy-expire + expirePendingDeposits + unit test (TDD)

**Files:**
- Modify: `SERVER/src/services/wallet/user-wallet.service.ts`
- Test: `SERVER/src/services/wallet/user-wallet.expiry.test.ts`

**Interfaces:**
- Consumes: `walletRepository.expireIfDue`, `walletRepository.expirePendingDeposits`, `walletRepository.findById`.
- Produces:
  - `userWalletService.getWalletTransactionById` lazy-expires an overdue pending deposit.
  - `userWalletService.expirePendingDeposits(): Promise<number>`

- [ ] **Step 1: Viết test thất bại** — tạo `user-wallet.expiry.test.ts`

Mirror mock style của `booking-auto-complete.service.test.ts`. Mock `walletRepository` (chỉ các method dùng tới) và bất kỳ dependency nào `user-wallet.service.ts` import ở top-level mà chạy khi new (nếu constructor nhẹ thì không cần). Nếu import side-effect nặng, mock thêm. Bắt đầu tối giản:

```ts
import { UserWalletService } from "./user-wallet.service";
import { walletRepository } from "../../repositories/wallet/wallet.repository";
import { TransactionStatus } from "../../constants/wallet";

jest.mock("../../repositories/wallet/wallet.repository", () => ({
  walletRepository: {
    findById: jest.fn(),
    expireIfDue: jest.fn(),
    expirePendingDeposits: jest.fn(),
  },
}));

const repo = walletRepository as jest.Mocked<typeof walletRepository>;
const service = new UserWalletService();

const USER_ID = "6512aaaa0000000000000001";
const TXN_ID = "6512bbbb0000000000000002";

const pendingTxn = (over: Record<string, unknown> = {}) =>
  ({
    _id: { toString: () => TXN_ID },
    user_id: USER_ID,
    status: TransactionStatus.PENDING,
    expires_at: new Date(Date.now() - 60_000),
    ...over,
  }) as never;

beforeEach(() => jest.clearAllMocks());

it("lazy-expires an overdue pending deposit on read", async () => {
  repo.findById.mockResolvedValue(pendingTxn());
  repo.expireIfDue.mockResolvedValue(
    pendingTxn({ status: TransactionStatus.EXPIRED }) as never
  );

  const result = await service.getWalletTransactionById(USER_ID, TXN_ID);

  expect(repo.expireIfDue).toHaveBeenCalledWith(TXN_ID, expect.any(Date));
  expect((result as { status: TransactionStatus }).status).toBe(
    TransactionStatus.EXPIRED
  );
});

it("does not expire a pending deposit that is not yet due", async () => {
  repo.findById.mockResolvedValue(
    pendingTxn({ expires_at: new Date(Date.now() + 60_000) })
  );

  const result = await service.getWalletTransactionById(USER_ID, TXN_ID);

  expect(repo.expireIfDue).not.toHaveBeenCalled();
  expect((result as { status: TransactionStatus }).status).toBe(
    TransactionStatus.PENDING
  );
});

it("does not touch a non-pending transaction", async () => {
  repo.findById.mockResolvedValue(
    pendingTxn({ status: TransactionStatus.SUCCESS, expires_at: new Date(Date.now() - 60_000) })
  );

  await service.getWalletTransactionById(USER_ID, TXN_ID);

  expect(repo.expireIfDue).not.toHaveBeenCalled();
});

it("expirePendingDeposits delegates to the repository", async () => {
  repo.expirePendingDeposits.mockResolvedValue(3);
  const count = await service.expirePendingDeposits();
  expect(count).toBe(3);
});
```

Nếu `UserWalletService` không được export as class, export nó (thêm `export` trước `class UserWalletService`) — kiểm tra file; nếu chỉ export singleton `userWalletService`, import singleton thay vì new.

- [ ] **Step 2: Chạy test — FAIL**

Run: `cd SERVER && npx jest src/services/wallet/user-wallet.expiry.test.ts`
Expected: FAIL (lazy-expire chưa có / `expirePendingDeposits` chưa có).

- [ ] **Step 3: Implement** — `user-wallet.service.ts`

Trong `getWalletTransactionById`, thay `return transaction;` cuối bằng:
```ts
    if (
      transaction.status === TransactionStatus.PENDING &&
      transaction.expires_at &&
      transaction.expires_at.getTime() <= Date.now()
    ) {
      const expired = await walletRepository.expireIfDue(
        transaction._id.toString(),
        new Date()
      );
      return expired ?? transaction;
    }

    return transaction;
```
Thêm method mới trong class:
```ts
  async expirePendingDeposits(): Promise<number> {
    const count = await walletRepository.expirePendingDeposits(new Date());
    if (count > 0) {
      logger.info("Expired pending deposit QR transactions", { count });
    }
    return count;
  }
```
`TransactionStatus`, `walletRepository`, `logger` đã import sẵn — xác nhận, không thêm trùng.

- [ ] **Step 4: Chạy test — PASS**

Run: `cd SERVER && npx jest src/services/wallet/user-wallet.expiry.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck**

Run: `cd SERVER && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add SERVER/src/services/wallet/user-wallet.service.ts SERVER/src/services/wallet/user-wallet.expiry.test.ts
git commit -m "feat(wallet): lazy-expire overdue pending deposits on read"
```

---

## Task 4: Backend — cron job + bootstrap wiring

**Files:**
- Create: `SERVER/src/jobs/wallet-deposit-expiration.job.ts`
- Modify: `SERVER/src/index.ts`

**Interfaces:**
- Consumes: `userWalletService.expirePendingDeposits` (Task 3), `withJobLock`, `logger`.
- Produces: `startWalletDepositExpirationJob()`, `stopWalletDepositExpirationJob()`.

- [ ] **Step 1: Cron job** — mirror `wallet-reconciliation.job.ts`

Tạo `SERVER/src/jobs/wallet-deposit-expiration.job.ts`:
```ts
import cron from "node-cron";
import { userWalletService } from "../services/wallet/user-wallet.service";
import { withJobLock } from "../utils/job-lock";
import { logger } from "../utils/logger";

// Every minute — QR TTL is 10 minutes; a 1-minute backstop is fine because the
// read path lazily expires overdue deposits for immediate UI feedback.
const CRON = "* * * * *";
const JOB_NAME = "wallet-deposit-expiration";
const JOB_LOCK_TTL_MS = 5 * 60 * 1000;

let task: ReturnType<typeof cron.schedule> | null = null;

export function startWalletDepositExpirationJob(): void {
  if (task) return;
  task = cron.schedule(CRON, async () => {
    try {
      await withJobLock(JOB_NAME, { ttlMs: JOB_LOCK_TTL_MS }, () =>
        userWalletService.expirePendingDeposits()
      );
    } catch (error) {
      logger.error("Wallet deposit expiration job failed:", error);
    }
  });
  logger.info(`Wallet deposit expiration job scheduled with cron "${CRON}"`);
}

export function stopWalletDepositExpirationJob(): void {
  if (!task) return;
  task.stop();
  task = null;
  logger.info("Wallet deposit expiration job stopped");
}
```
Xác nhận `userWalletService` là export singleton của `user-wallet.service.ts` (nếu tên khác, dùng đúng tên export). Xác nhận signature `withJobLock(name, opts, fn)` khớp cách `wallet-reconciliation.job.ts` gọi.

- [ ] **Step 2: Bootstrap** — `SERVER/src/index.ts`

Tìm nơi các job khác được start (vd. `startWalletReconciliationJob()`), thêm import và gọi `startWalletDepositExpirationJob()` cùng chỗ; trong graceful shutdown thêm `stopWalletDepositExpirationJob()`. **Lưu ý: có HAI shutdown path** cùng gọi `stopWalletReconciliationJob()` (SIGTERM và SIGINT) — thêm stop vào **cả hai**. Theo đúng pattern hiện có.

- [ ] **Step 3: Typecheck**

Run: `cd SERVER && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add SERVER/src/jobs/wallet-deposit-expiration.job.ts SERVER/src/index.ts
git commit -m "feat(wallet): schedule cron to expire overdue pending deposits"
```

---

## Task 5: Frontend — types + i18n

**Files:**
- Modify: `pr1as-client/services/wallet.service.ts`
- Modify: `pr1as-client/messages/{vi,en,zh,ko}.json`

**Interfaces:**
- Produces: status union with `"expired"`; `WalletTransaction.expires_at`; `DepositPayment.expires_at`; i18n keys under `Wallet`.

- [ ] **Step 1: Types** — `wallet.service.ts`
```ts
export type WalletTransactionStatus =
  | "pending"
  | "success"
  | "failed"
  | "cancelled"
  | "expired"
```
Trong `WalletTransaction` thêm:
```ts
  expires_at?: string | null
```
Trong `DepositPayment` thêm:
```ts
  expires_at?: string
```

- [ ] **Step 2: i18n** — thêm vào object `"Wallet"` trong cả 4 file.

`vi.json`:
```json
"qrCountdown": "QR hết hạn sau {time}",
"qrExpiredTitle": "QR đã hết hạn",
"qrExpiredMsg": "Mã QR đã quá hạn 10 phút. Vui lòng tạo mã mới để tiếp tục.",
"regenerateQr": "Tạo QR mới"
```
`en.json`:
```json
"qrCountdown": "QR expires in {time}",
"qrExpiredTitle": "QR expired",
"qrExpiredMsg": "This QR code passed its 10-minute limit. Create a new one to continue.",
"regenerateQr": "Create new QR"
```
`zh.json`:
```json
"qrCountdown": "二维码将在 {time} 后过期",
"qrExpiredTitle": "二维码已过期",
"qrExpiredMsg": "此二维码已超过 10 分钟有效期。请生成新的二维码以继续。",
"regenerateQr": "生成新二维码"
```
`ko.json`:
```json
"qrCountdown": "QR 만료까지 {time}",
"qrExpiredTitle": "QR 만료됨",
"qrExpiredMsg": "이 QR 코드는 10분 제한을 초과했습니다. 계속하려면 새로 생성하세요.",
"regenerateQr": "새 QR 생성"
```

- [ ] **Step 3: Verify JSON + typecheck**

Run: `cd pr1as-client && node -e "['vi','en','zh','ko'].forEach(l=>JSON.parse(require('fs').readFileSync('messages/'+l+'.json')))" && npx tsc --noEmit`
Expected: PASS (bỏ qua lỗi generated `.next/…validator.ts`/quick-booking không liên quan).

- [ ] **Step 4: Commit**

```bash
git add pr1as-client/services/wallet.service.ts pr1as-client/messages/vi.json pr1as-client/messages/en.json pr1as-client/messages/zh.json pr1as-client/messages/ko.json
git commit -m "feat(wallet): add expired status type and QR expiry i18n keys"
```

---

## Task 6: Frontend — deposit page countdown + expired state + regenerate

**Files:**
- Modify: `pr1as-client/components/wallet/wallet-deposit-page.tsx`

**Interfaces:**
- Consumes: `DepositPayment.expires_at`, `WalletTransactionStatus` `"expired"` (Task 5), i18n keys (Task 5), `useCreateDeposit`, `useWalletTransaction`.

- [ ] **Step 1: Countdown + expired state**

Sau dòng `const isPaymentFailed = transactionStatus === "failed"`, thêm:
```ts
  const isPaymentExpired = transactionStatus === "expired"
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!payment?.expires_at || isPaymentSuccess || isPaymentFailed) {
      return
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [payment?.expires_at, isPaymentSuccess, isPaymentFailed])

  const msLeft = payment?.expires_at
    ? new Date(payment.expires_at).getTime() - now
    : 0
  const isExpired = isPaymentExpired || (Boolean(payment?.expires_at) && msLeft <= 0)
  const countdownLabel = (() => {
    const totalSeconds = Math.max(0, Math.floor(msLeft / 1000))
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0")
    const ss = String(totalSeconds % 60).padStart(2, "0")
    return `${mm}:${ss}`
  })()
```

- [ ] **Step 2: Regenerate handler**

Thêm gần `handleSubmit`:
```ts
  const handleRegenerate = async () => {
    if (amountError) {
      toast.warning(amountError)
      return
    }
    try {
      const result = await createDepositMutation.mutateAsync({
        amount: parsedAmount,
      })
      if (!result) {
        toast.error(t("cannotCreatePayment"))
        return
      }
      notifiedTransactionRef.current = null
      setNow(Date.now())
      setPayment(result)
      toast.success(t("paymentCreated"))
    } catch (error) {
      toast.error(getErrorMessage(error, t("cannotCreatePayment")))
    }
  }
```

- [ ] **Step 3: Render — expired UI + countdown**

Trong nhánh `{payment ? (` của khối QR (khoảng dòng 218-279), bọc theo `isExpired`. Thay khối `<div className="grid gap-6 md:grid-cols-[260px_1fr]">…</div>` bằng:
```tsx
              isExpired ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 text-center">
                  <XCircle className="size-10 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-base font-semibold">
                      {t("qrExpiredTitle")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("qrExpiredMsg")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={createDepositMutation.isPending || Boolean(amountError)}
                  >
                    {createDepositMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <QrCode className="size-4" />
                    )}
                    {t("regenerateQr")}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-[260px_1fr]">
                  {/* … khối QR + PaymentRow + PaymentStatus giữ nguyên … */}
                </div>
              )
```
Trong khối QR không hết hạn, thêm dòng đếm ngược ngay TRÊN `<PaymentStatus … />` (khi chưa success/failed):
```tsx
                  {!isPaymentSuccess && !isPaymentFailed ? (
                    <p className="text-center text-xs font-medium text-muted-foreground">
                      {t("qrCountdown", { time: countdownLabel })}
                    </p>
                  ) : null}
```
Giữ nguyên `<PaymentStatus>` và nút "viewWallet". `XCircle`, `QrCode`, `Loader2` đã import sẵn.

- [ ] **Step 4: Typecheck**

Run: `cd pr1as-client && npx tsc --noEmit`
Expected: PASS (bỏ qua lỗi generated không liên quan).

- [ ] **Step 5: Manual verification**

- Tạo QR nạp ví → thấy đếm ngược `09:59…` giảm dần.
- Đợi hết hạn (hoặc chỉnh TTL tạm 1 phút để test) → QR ẩn, hiện "QR đã hết hạn" + nút "Tạo QR mới".
- Bấm "Tạo QR mới" → QR mới, đồng hồ reset.
- Đổi 4 ngôn ngữ → không vỡ layout.

- [ ] **Step 6: Commit**

```bash
git add pr1as-client/components/wallet/wallet-deposit-page.tsx
git commit -m "feat(wallet): show QR countdown and regenerate on deposit expiry"
```

---

## Self-Review

**Spec coverage:**
- Status `expired` + `expires_at` → Task 1. ✓
- Set expiry khi tạo deposit + response → Task 2. ✓
- Cron backstop → Task 4; lazy-expire on read → Task 3. ✓
- Webhook money-safe không đổi → không có task (đã xác minh trong spec). ✓
- Chỉ nạp ví, không pricing → Task 2 Step 3 (không sửa createPricingPayment); cron/lazy lọc `expires_at != null`. ✓
- FE countdown + expired + regenerate → Task 6; types + i18n → Task 5. ✓

**Placeholder scan:** không có TBD; các "xác nhận tên export/import" là verify danh tính symbol, không phải placeholder logic.

**Type consistency:** `expires_at` (BE `Date`/ISO string, FE `string`) nhất quán; `expirePendingDeposits(): Promise<number>` khớp repo↔service↔cron; `expireIfDue(id, now)` khớp repo↔service; status `"expired"` thêm ở cả BE enum và FE union; `DepositPayment.expires_at` dùng trong Task 6.
