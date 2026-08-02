# Worker Reputation Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 5 gaps surfaced by the final whole-branch review of the worker reputation rework: lock down client review edit/delete (anti-farming), catch the admin config UI up to the 12 new reputation keys, make `updateUserByAdmin` reset/sync worker reputation like the other worker-creation paths, fix a role-blind fallback in `post.service.ts`, and rewrite the stale memory-bank doc.

**Architecture:** Five independent, small changes across backend services and one frontend admin page. No shared new abstractions — each fix reuses an existing pattern established in the original 16-task plan (`comment.service.ts`'s role-aware fallback pattern, `becomeWorker`'s reset-to-0 pattern, `CONFIG_META`'s existing manual-label pattern).

**Tech Stack:** Node.js/Express/TypeScript/Mongoose (`SERVER/`), Next.js/React/TypeScript (`pr1as-client/`), Jest.

## Global Constraints

- Admin retains full update/delete rights on reviews (moderation) — only the CLIENT-as-owner path is removed.
- No client-facing UI currently calls review update/delete (confirmed: frontend is create-only) — this change has zero frontend impact, no frontend task needed for item 1.
- `min_profile_photos_threshold` is NOT toggleable (matches `low_review_threshold`'s existing non-toggleable pattern) — must not appear with a toggle switch in the admin UI.
- Full spec: [docs/superpowers/specs/2026-08-02-worker-reputation-followups-design.md](../specs/2026-08-02-worker-reputation-followups-design.md).
- This codebase has no live-database test infrastructure — mock the Mongoose model/repository layer directly (established convention from the original 16-task plan).
- Formatting discipline: do NOT run `prettier --write` or any whole-file formatter. Commit hygiene: `git status --short` before staging, stage only the exact files each task touches by explicit path, never `git add -A`/`.`/`-u`.

---

### Task 1: Lock down client review update/delete

**Files:**
- Modify: `SERVER/src/services/review/review.service.ts:263-348` (`updateReview`, `deleteReview`)
- Test: `SERVER/src/services/review/review.service.test.ts` (extend existing file)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks (leaf change).

- [ ] **Step 1: Write the failing tests**

Read the existing `review.service.test.ts` first to match its mocking conventions exactly, then add:

```ts
it("rejects updateReview from the owning client (client can no longer edit)", async () => {
  reviewRepo.findById.mockResolvedValue({
    _id: "r1",
    client_id: "client1",
    worker_id: "worker1",
    status: undefined,
  } as never);

  await expect(
    service.updateReview("r1", { rating: 4 }, "client1", ["client"])
  ).rejects.toThrow();
});

it("still allows updateReview from an admin", async () => {
  reviewRepo.findById.mockResolvedValue({
    _id: "r1",
    client_id: "client1",
    worker_id: "worker1",
  } as never);
  reviewRepo.update.mockResolvedValue({ _id: "r1", rating: 4 } as never);

  await expect(
    service.updateReview("r1", { rating: 4 }, "admin1", ["admin"])
  ).resolves.toBeDefined();
});

it("rejects deleteReview from the owning client (client can no longer delete)", async () => {
  reviewRepo.findById.mockResolvedValue({
    _id: "r1",
    client_id: "client1",
    worker_id: "worker1",
  } as never);

  await expect(
    service.deleteReview("r1", "client1", ["client"])
  ).rejects.toThrow();
});

it("still allows deleteReview from an admin", async () => {
  reviewRepo.findById.mockResolvedValue({
    _id: "r1",
    client_id: "client1",
    worker_id: "worker1",
  } as never);
  reviewRepo.delete.mockResolvedValue(true as never);

  await expect(
    service.deleteReview("r1", "admin1", ["admin"])
  ).resolves.toBeUndefined();
});
```

(Adjust the mocked `Review` shape/`reviewRepo` mock names to whatever the existing test file already uses — it already mocks `reviewRepository` from an earlier task.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd SERVER && npx jest review.service.test.ts`
Expected: FAIL — the two "rejects ... from the owning client" tests currently resolve successfully instead of throwing, because the existing `isOwner` check still permits the client.

- [ ] **Step 3: Implement**

Edit `SERVER/src/services/review/review.service.ts`, `updateReview` (around line 263-313):

```ts
  async updateReview(
    reviewId: string,
    updateData: UpdateReviewInput,
    userId: string,
    userRoles: string[]
  ): Promise<IReviewDocument> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    if (review.status === ReviewStatus.APPROVED) {
      throw new AppError(
        REVIEW_MESSAGES.CANNOT_UPDATE_REVIEW,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.REVIEW_CANNOT_UPDATE
      );
    }

    // Reviews are immutable for the client once created — only admin can
    // edit (moderation). Prevents farming reputation bonuses via
    // create -> edit-rating-up cycles.
    const isAdmin = userRoles.includes(UserRole.ADMIN);
    if (!isAdmin) {
      throw new AppError(
        REVIEW_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.REVIEW_UNAUTHORIZED_ACCESS
      );
    }

    const updatedReview = await reviewRepository.update(reviewId, updateData);
    if (!updatedReview) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    void notificationEventService
      .reviewUpdated(updatedReview, userId)
      .catch((error) =>
        logger.error("Review update notification failed:", error)
      );

    return updatedReview;
  }
```

Edit `deleteReview` (around line 315-348) the same way:

```ts
  async deleteReview(
    reviewId: string,
    userId: string,
    userRoles: string[]
  ): Promise<void> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }

    // Reviews are immutable for the client once created — only admin can
    // delete (moderation). Prevents farming reputation bonuses via
    // create -> delete -> recreate cycles.
    const isAdmin = userRoles.includes(UserRole.ADMIN);
    if (!isAdmin) {
      throw new AppError(
        REVIEW_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.REVIEW_UNAUTHORIZED_ACCESS
      );
    }

    const deleted = await reviewRepository.delete(reviewId);
    if (!deleted) {
      throw new AppError(
        REVIEW_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.REVIEW_NOT_FOUND
      );
    }
  }
```

Note: `userId` parameter in `deleteReview` becomes unused by this change if it was only used for the ownership check — check the current signature; if `userId` is now genuinely unused, the strict `noUnusedParameters` tsconfig will fail the build. Since the method is a public service method called with a fixed signature from the controller, keep the parameter (controllers/callers still pass it) but prefix it `_userId` only if TypeScript actually flags it as unused — check by running the build; `noUnusedParameters` typically does not flag parameters that are part of a method's declared signature unless the project's tsconfig has additional lint rules for it. Verify with `npx tsc --noEmit` and fix only if it actually errors.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd SERVER && npx jest review.service.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors (see note above about unused `userId`).

- [ ] **Step 6: Update memorybank/review.md**

Edit `memorybank/review.md`'s "Update Review" and "Delete Review" sections to state that only admin can update/delete a review — the client-owner path was removed to prevent reputation-bonus farming via create/delete/recreate cycles. Update the "Common Implementation Checklist" item "Owner client or admin can update/delete" if present.

- [ ] **Step 7: Commit**

```bash
git status --short
git add SERVER/src/services/review/review.service.ts SERVER/src/services/review/review.service.test.ts memorybank/review.md
git commit -m "fix(review): lock review update/delete to admin only, close farming vector"
```

---

### Task 2: Admin config UI — add the 12 new reputation keys

**Files:**
- Modify: `pr1as-client/services/reputation-config.service.ts` (`ReputationConfigKey` type, `TOGGLEABLE_REPUTATION_KEYS`)
- Modify: `pr1as-client/app/dashboard/reputation-config/page.tsx` (`CONFIG_META`, `orderedKeys`)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks (leaf, UI-only).

- [ ] **Step 1: Extend the frontend key union and toggleable list**

Edit `pr1as-client/services/reputation-config.service.ts`:

```ts
export type ReputationConfigKey =
  | "booking_expiry_deduction"
  | "worker_cancel_deduction"
  | "client_late_cancel_deduction"
  | "low_review_deduction"
  | "low_review_threshold"
  | "daily_recovery_points"
  | "warning_threshold"
  | "profile_photos_bonus"
  | "min_profile_photos_threshold"
  | "profile_info_field_bonus"
  | "review_received_bonus"
  | "five_star_review_bonus"
  | "job_completion_bonus"
  | "report_filed_valid_bonus"
  | "reported_valid_penalty"
  | "late_completion_penalty"
  | "cancel_medium_penalty"
  | "cancel_severe_penalty"
  | "cancel_noshow_penalty"

/** Keys whose scoring action can be toggled on/off via the `active` flag. */
export const TOGGLEABLE_REPUTATION_KEYS: ReputationConfigKey[] = [
  "booking_expiry_deduction",
  "worker_cancel_deduction",
  "client_late_cancel_deduction",
  "low_review_deduction",
  "daily_recovery_points",
  "profile_photos_bonus",
  "profile_info_field_bonus",
  "review_received_bonus",
  "five_star_review_bonus",
  "job_completion_bonus",
  "report_filed_valid_bonus",
  "reported_valid_penalty",
  "late_completion_penalty",
  "cancel_medium_penalty",
  "cancel_severe_penalty",
  "cancel_noshow_penalty",
]
```

- [ ] **Step 2: Add labels for the 12 new keys and drop the dead one from the visible order**

Edit `pr1as-client/app/dashboard/reputation-config/page.tsx`. First add imports for a few more icons from `lucide-react` (reuse `Star`/`Clock`/`XCircle`/`TrendingUp` where fitting, add `Image`, `FileText`, `CheckCircle2`, `Flag`, `ShieldAlert`, `CalendarX` as needed — pick sensible ones, exact icon choice is not load-bearing):

```ts
import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  Clock,
  Flag,
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Save,
  ShieldAlert,
  Star,
  StarOff,
  TrendingUp,
  XCircle,
} from "lucide-react"
```

Extend `CONFIG_META`, adding after the existing 7 entries (`worker_cancel_deduction`'s entry stays in `CONFIG_META` — only removed from `orderedKeys` below — so a legacy config row already in the database still renders a label if ever surfaced by ID, but it no longer appears in the default list):

```ts
  profile_photos_bonus: {
    label: "Đủ ảnh hồ sơ",
    description: "Điểm cộng khi worker có đủ số ảnh tối thiểu trong thư viện ảnh.",
    icon: <ImageIcon className="size-4" />,
    unit: "điểm",
    hint: "Cộng một lần khi đạt ngưỡng số ảnh tối thiểu bên dưới",
  },
  min_profile_photos_threshold: {
    label: "Số ảnh tối thiểu",
    description: "Số ảnh tối thiểu trong hồ sơ để được cộng điểm ảnh.",
    icon: <ImageIcon className="size-4" />,
    unit: "ảnh",
    hint: "Không thể tắt — luôn được áp dụng khi tính điểm hồ sơ",
  },
  profile_info_field_bonus: {
    label: "Mỗi trường thông tin hồ sơ",
    description: "Điểm cộng cho mỗi trường thông tin hồ sơ được điền (tối đa 10 trường).",
    icon: <CheckCircle2 className="size-4" />,
    unit: "điểm/trường",
    hint: "Tính lại mỗi khi worker cập nhật hồ sơ",
  },
  review_received_bonus: {
    label: "Nhận được đánh giá",
    description: "Điểm cộng cho worker mỗi khi nhận một đánh giá mới, bất kể số sao.",
    icon: <Star className="size-4" />,
    unit: "điểm",
    hint: "Cộng một lần cho mỗi đánh giá hợp lệ",
  },
  five_star_review_bonus: {
    label: "Đánh giá 5 sao",
    description: "Điểm cộng thêm khi đánh giá nhận được là 5 sao.",
    icon: <Star className="size-4" />,
    unit: "điểm",
    hint: "Cộng thêm, ngoài điểm nhận đánh giá ở trên",
  },
  job_completion_bonus: {
    label: "Hoàn thành job",
    description: "Điểm cộng khi một booking worker thực hiện chuyển sang hoàn thành.",
    icon: <CheckCircle2 className="size-4" />,
    unit: "điểm",
    hint: "Áp dụng cho mọi booking hoàn thành, kể cả tự động hoàn thành",
  },
  report_filed_valid_bonus: {
    label: "Báo cáo vi phạm đúng",
    description: "Điểm cộng khi báo cáo do worker gửi được admin xác nhận đúng.",
    icon: <Flag className="size-4" />,
    unit: "điểm",
    hint: "Áp dụng khi worker là người báo cáo",
  },
  reported_valid_penalty: {
    label: "Bị báo cáo đúng",
    description: "Điểm bị trừ khi báo cáo nhắm vào worker được admin xác nhận đúng.",
    icon: <ShieldAlert className="size-4" />,
    unit: "điểm",
    hint: "Áp dụng khi worker là đối tượng bị báo cáo",
  },
  late_completion_penalty: {
    label: "Trễ hoàn thành",
    description: "Điểm bị trừ khi booking đã bắt đầu nhưng worker quên bấm hoàn thành, hệ thống tự động đóng.",
    icon: <Clock className="size-4" />,
    unit: "điểm",
    hint: "Chỉ áp dụng khi booking đã ở trạng thái đang thực hiện",
  },
  cancel_medium_penalty: {
    label: "Huỷ lịch (30 phút - 2 giờ)",
    description: "Điểm bị trừ khi worker huỷ booking còn 30 phút đến 2 giờ là tới giờ hẹn.",
    icon: <CalendarX className="size-4" />,
    unit: "điểm",
    hint: "Mức nhẹ hơn trong 3 mức phạt huỷ lịch",
  },
  cancel_severe_penalty: {
    label: "Huỷ lịch (dưới 30 phút)",
    description: "Điểm bị trừ khi worker huỷ booking khi còn chưa tới 30 phút là tới giờ hẹn.",
    icon: <CalendarX className="size-4" />,
    unit: "điểm",
    hint: "Mức nặng hơn trong 3 mức phạt huỷ lịch",
  },
  cancel_noshow_penalty: {
    label: "Bom lịch",
    description: "Điểm bị trừ khi dispute worker không đến (no-show) được admin xác nhận đúng.",
    icon: <XCircle className="size-4" />,
    unit: "điểm",
    hint: "Mức nặng nhất trong các quy tắc huỷ/không đến",
  },
```

Update `orderedKeys` in `ReputationConfigPage`, removing `worker_cancel_deduction` (dead rule) and appending the 12 new keys grouped logically:

```ts
  const orderedKeys: ReputationConfigKey[] = [
    "booking_expiry_deduction",
    "client_late_cancel_deduction",
    "low_review_deduction",
    "low_review_threshold",
    "daily_recovery_points",
    "warning_threshold",
    "profile_photos_bonus",
    "min_profile_photos_threshold",
    "profile_info_field_bonus",
    "review_received_bonus",
    "five_star_review_bonus",
    "job_completion_bonus",
    "report_filed_valid_bonus",
    "reported_valid_penalty",
    "late_completion_penalty",
    "cancel_medium_penalty",
    "cancel_severe_penalty",
    "cancel_noshow_penalty",
  ]
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd pr1as-client && npm run typecheck && npm run lint`
Expected: no errors. `CONFIG_META` is typed `Record<ReputationConfigKey, ConfigMeta>`, so TypeScript will error if any key in the (now 19-member) union lacks an entry — this structurally guarantees nothing is missed.

- [ ] **Step 4: Manual verification**

Run `cd pr1as-client && npm run dev`, open `/dashboard/reputation-config` as an admin, confirm all 18 visible keys render with labels (19 total keys exist including the now-hidden `worker_cancel_deduction`), toggle switches only appear on the 15 toggleable keys, and `min_profile_photos_threshold`/`low_review_threshold`/`warning_threshold` have no toggle switch.

- [ ] **Step 5: Commit**

```bash
git status --short
git add pr1as-client/services/reputation-config.service.ts pr1as-client/app/dashboard/reputation-config/page.tsx
git commit -m "feat(admin): add the 12 new reputation config keys to the config dashboard"
```

---

### Task 3: `updateUserByAdmin` resets worker reputation and syncs profile completeness

**Files:**
- Modify: `SERVER/src/services/user/user.service.ts:582-669` (`updateUserByAdmin`)
- Test: `SERVER/src/services/user/user.service.test.ts` (new — check first if it exists)

**Interfaces:**
- Consumes: `userRepository.setReputationScoreAndComponent` (from the original plan's Task 16), `reputationService.syncWorkerProfileCompleteness` (from the original plan's Task 9).
- Produces: nothing consumed elsewhere (leaf hook).

- [ ] **Step 1: Write the failing tests**

Check whether `SERVER/src/services/user/user.service.test.ts` already exists; if not, create it following the mocking conventions established elsewhere in this plan (mock `userRepository`, `reputationService`, `workerServiceRepository`, `workerPointWalletRepository`, `invalidateUserStatusCache`, `logger`).

```ts
// SERVER/src/services/user/user.service.test.ts
import { UserService } from "./user.service";
import { userRepository } from "../../repositories/auth/user.repository";
import { reputationService } from "../reputation/reputation.service";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { workerPointWalletRepository } from "../../repositories/boost/worker-point-wallet.repository";
import { UserRole, UserStatus } from "../../types/auth/user.types";

jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: {
    findById: jest.fn(),
    emailExists: jest.fn(),
    updateByAdmin: jest.fn(),
    setReputationScoreAndComponent: jest.fn(),
  },
}));
jest.mock("../reputation/reputation.service", () => ({
  reputationService: { syncWorkerProfileCompleteness: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("../../repositories/worker/worker-service.repository", () => ({
  workerServiceRepository: {
    deleteAllForWorker: jest.fn().mockResolvedValue(undefined),
    upsertManyForWorker: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../../repositories/boost/worker-point-wallet.repository", () => ({
  workerPointWalletRepository: { findOrCreate: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("../../utils/userStatusCache", () => ({
  invalidateUserStatusCache: jest.fn(),
}));

const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const repService = reputationService as jest.Mocked<typeof reputationService>;

const service = new UserService();

const baseInput = {
  full_name: "Test User",
  roles: [UserRole.CLIENT, UserRole.WORKER] as UserRole[],
  status: UserStatus.ACTIVE,
  worker_profile: { gender: "OTHER" },
  worker_services: [],
} as never;

beforeEach(() => jest.clearAllMocks());

it("resets reputation to 0 when promoting a client to worker for the first time", async () => {
  userRepo.findById
    .mockResolvedValueOnce({
      created_by_admin: true,
      roles: [UserRole.CLIENT],
      email: "a@test.com",
    } as never) // existing, fetched first
    .mockResolvedValueOnce({
      _id: { toString: () => "u1" },
      roles: [UserRole.CLIENT, UserRole.WORKER],
      worker_profile: { gender: "OTHER" },
      meta_data: { reputation_score: 0, reputation_profile_component: 0 },
    } as never); // re-fetched after reset, before sync
  userRepo.updateByAdmin.mockResolvedValue({
    _id: { toString: () => "u1" },
    roles: [UserRole.CLIENT, UserRole.WORKER],
  } as never);

  await service.updateUserByAdmin("u1", baseInput);
  await new Promise((r) => setTimeout(r, 0));

  expect(userRepo.setReputationScoreAndComponent).toHaveBeenCalledWith("u1", 0, 0);
  expect(repService.syncWorkerProfileCompleteness).toHaveBeenCalled();
});

it("does not reset reputation when the user was already a worker", async () => {
  userRepo.findById
    .mockResolvedValueOnce({
      created_by_admin: true,
      roles: [UserRole.CLIENT, UserRole.WORKER],
      email: "a@test.com",
    } as never)
    .mockResolvedValueOnce({
      _id: { toString: () => "u1" },
      roles: [UserRole.CLIENT, UserRole.WORKER],
      worker_profile: { gender: "OTHER" },
      meta_data: { reputation_score: 55, reputation_profile_component: 20 },
    } as never);
  userRepo.updateByAdmin.mockResolvedValue({
    _id: { toString: () => "u1" },
    roles: [UserRole.CLIENT, UserRole.WORKER],
  } as never);

  await service.updateUserByAdmin("u1", baseInput);
  await new Promise((r) => setTimeout(r, 0));

  expect(userRepo.setReputationScoreAndComponent).not.toHaveBeenCalled();
  expect(repService.syncWorkerProfileCompleteness).toHaveBeenCalled();
});

it("does not touch reputation at all when the edited user is not a worker", async () => {
  userRepo.findById.mockResolvedValueOnce({
    created_by_admin: true,
    roles: [UserRole.CLIENT],
    email: "a@test.com",
  } as never);
  userRepo.updateByAdmin.mockResolvedValue({
    _id: { toString: () => "u1" },
    roles: [UserRole.CLIENT],
  } as never);

  await service.updateUserByAdmin("u1", {
    ...baseInput,
    roles: [UserRole.CLIENT],
  } as never);
  await new Promise((r) => setTimeout(r, 0));

  expect(userRepo.setReputationScoreAndComponent).not.toHaveBeenCalled();
  expect(repService.syncWorkerProfileCompleteness).not.toHaveBeenCalled();
});
```

Adjust mocks/shapes as needed to match the real method signatures if they differ from what's assumed here — read `user.service.ts:582-669` and `user.repository.ts`'s `updateByAdmin`/`setReputationScoreAndComponent` first.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd SERVER && npx jest user.service.test.ts`
Expected: FAIL — `setReputationScoreAndComponent` and `syncWorkerProfileCompleteness` are never called by the current code.

- [ ] **Step 3: Implement**

Edit `SERVER/src/services/user/user.service.ts`, add import:

```ts
import { reputationService } from "../reputation/reputation.service";
```

Edit `updateUserByAdmin` (around line 582-669), capturing `wasWorker` before computing the new role set, and adding the reset+sync after `updateByAdmin` succeeds:

```ts
  async updateUserByAdmin(
    userId: string,
    input: AdminUpdateUserSchemaType
  ): Promise<IUserDocument> {
    const existing = await userRepository.findById(userId);
    if (!existing) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    // Only admin-provisioned accounts are editable; real users are read-only.
    if (!existing.created_by_admin) {
      throw AppError.forbidden(USER_MESSAGES.NOT_ADMIN_CREATED);
    }

    const wasWorker = existing.roles.includes(UserRole.WORKER);

    const newEmail = input.email?.toLowerCase().trim();
    if (newEmail && newEmail !== existing.email) {
      if (await userRepository.emailExists(newEmail)) {
        throw AppError.badRequest(AUTH_MESSAGES.EMAIL_EXISTS, [
          { field: "email", message: AUTH_MESSAGES.EMAIL_EXISTS },
        ]);
      }
    }

    const isWorker = input.roles.includes(UserRole.WORKER);
    const isAdmin = existing.roles.includes(UserRole.ADMIN);

    const roleSet = new Set<UserRole>(
      isWorker ? [UserRole.CLIENT, UserRole.WORKER] : [UserRole.CLIENT]
    );
    if (isAdmin) roleSet.add(UserRole.ADMIN);
    const roles = Array.from(roleSet);

    const lastActiveRole =
      existing.last_active_role === UserRole.ADMIN
        ? UserRole.ADMIN
        : isWorker
          ? UserRole.WORKER
          : UserRole.CLIENT;

    const workerServicePayloads = isWorker
      ? await this.resolveWorkerServices(input.worker_services!)
      : [];

    let workerProfile: Record<string, unknown> | null = null;
    if (isWorker && input.worker_profile) {
      const { coords: _coords, ...profileFields } = input.worker_profile;
      void _coords;
      workerProfile = profileFields;
    }

    const password_hash = input.password
      ? await hashPassword(input.password)
      : undefined;

    const user = await userRepository.updateByAdmin(userId, {
      email: newEmail,
      password_hash,
      full_name: input.full_name.trim(),
      phone: input.phone ?? null,
      avatar: input.avatar ?? null,
      roles,
      last_active_role: lastActiveRole,
      status: input.status,
      worker_profile: workerProfile,
    });
    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    // Replace the worker service offerings so removed services disappear.
    await workerServiceRepository.deleteAllForWorker(userId);
    if (isWorker) {
      await workerPointWalletRepository.findOrCreate(userId);
      await workerServiceRepository.upsertManyForWorker(
        userId,
        workerServicePayloads,
        new Date()
      );

      // First time becoming a worker via admin edit: reset reputation to 0,
      // same as becomeWorker/createByAdmin — discards any prior client score
      // (accepted tradeoff, see design spec "Dual-role field").
      if (!wasWorker) {
        await userRepository.setReputationScoreAndComponent(userId, 0, 0);
      }

      // Re-fetch so the profile-completeness sync sees the just-applied
      // reset (if any) and the freshly-written worker_profile, not a stale
      // copy from before this request's writes.
      const freshUser = await userRepository.findById(userId);
      if (freshUser) {
        void reputationService
          .syncWorkerProfileCompleteness(freshUser)
          .catch((error) =>
            logger.error(
              "Reputation profile-completeness sync failed for admin-edited worker:",
              error
            )
          );
      }
    }

    // Status may have changed — drop the cached status so auth checks see it.
    invalidateUserStatusCache(userId);

    logger.info("AUDIT admin updated user", {
      event: "ADMIN_UPDATE_USER",
      userId,
      roles,
      isWorker,
    });

    return user;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd SERVER && npx jest user.service.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck and regression**

Run: `cd SERVER && npx tsc --noEmit && npx jest user.service user.repository`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git status --short
git add SERVER/src/services/user/user.service.ts SERVER/src/services/user/user.service.test.ts
git commit -m "fix(reputation): reset score and sync profile completeness when admin edit promotes a user to worker"
```

---

### Task 4: `post.service.ts` role-aware reputation fallback

**Files:**
- Modify: `SERVER/src/services/post/post.service.ts:234-236` (`assertUserCanCreatePost`)
- Test: `SERVER/src/services/post/post.service.test.ts` (check first if it exists; extend or create)

**Interfaces:**
- Consumes: nothing new (`UserRole` already imported in this file).
- Produces: nothing consumed elsewhere (leaf fix).

- [ ] **Step 1: Write the failing test**

Check whether `post.service.test.ts` exists first. If it does, extend it matching its conventions; if not, a minimal new file covering just this method is enough — do not build a full post-service test suite beyond what this task needs.

```ts
it("defaults a scoreless worker's post-creation reputation check to 0, not 100", async () => {
  userRepo.findById.mockResolvedValue({
    roles: [UserRole.CLIENT, UserRole.WORKER],
    meta_data: {},
    last_active_role: UserRole.CLIENT,
  } as never);

  await expect(
    (service as never as { assertUserCanCreatePost: (id: string) => Promise<void> })
      .assertUserCanCreatePost("u1")
  ).rejects.toThrow();
});

it("defaults a scoreless client's post-creation reputation check to 100", async () => {
  userRepo.findById.mockResolvedValue({
    roles: [UserRole.CLIENT],
    meta_data: {},
    last_active_role: UserRole.CLIENT,
  } as never);

  await expect(
    (service as never as { assertUserCanCreatePost: (id: string) => Promise<void> })
      .assertUserCanCreatePost("u1")
  ).resolves.toBeUndefined();
});
```

`assertUserCanCreatePost` is `private` — if the existing test file doesn't already have a pattern for reaching private methods (cast through `as never as {...}` like above, or via the public method that calls it), check how other private-method tests in this codebase handle it and follow that convention instead if different.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest post.service.test.ts`
Expected: FAIL — a worker with no stored score currently passes the `<30` check (defaults to 100) instead of failing it (should default to 0, which is `< 30`).

- [ ] **Step 3: Implement**

Edit `SERVER/src/services/post/post.service.ts:234-236`:

```ts
  private async assertUserCanCreatePost(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    const defaultPostReputation = user?.roles?.includes(UserRole.WORKER)
      ? 0
      : 100;
    const reputation =
      user?.meta_data?.reputation_score ?? defaultPostReputation;
    if (reputation < 30) {
      throw new AppError(
        REPUTATION_MESSAGES.TOO_LOW_FOR_POST,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.REPUTATION_SCORE_TOO_LOW
      );
    }

    // Posts in this app are job listings — gated by the `create_job_*`
```

(`UserRole` is already imported at the top of this file — no new import needed.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest post.service.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `cd SERVER && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git status --short
git add SERVER/src/services/post/post.service.ts SERVER/src/services/post/post.service.test.ts
git commit -m "fix(reputation): role-aware post-creation reputation fallback, 0 for workers instead of 100"
```

---

### Task 5: Rewrite `memorybank/reputation.md`

**Files:**
- Modify: `memorybank/reputation.md` (full rewrite of the sections describing scoring rules)

**Interfaces:** None — documentation only.

- [ ] **Step 1: Rewrite the doc**

Read the current `memorybank/reputation.md` in full, then rewrite it to describe the shipped model. Cover:

- **Purpose/Score Storage**: client keeps default-100, decrement-only model unchanged; worker starts at 0 and builds up through 12 rules, tracked via `meta_data.reputation_score` (shared field, reset to 0 the moment a user first gains the `worker` role) and `meta_data.reputation_profile_component` (tracks the profile-completeness component for idempotent recompute).
- **Config table**: replace the old 7-row table with all 19 keys (7 original + 12 new), matching `REPUTATION_CONFIG_DEFAULTS` in `SERVER/src/types/reputation/reputation-config.types.ts` — values, toggleable status, description.
- **Deduction/Addition Events**: replace with the 12-rule table from the design spec (`docs/superpowers/specs/2026-08-02-worker-reputation-rework-design.md`), including which existing mechanism each reuses (auto-complete job's started/unstarted split for late-completion; dispute `WORKER_NO_SHOW` + `FAVOR_CLIENT` for no-show; no new booking status or cron job was added).
- **Migration**: document the one-time `npm run migrate:worker-reputation` script and that it does not retroactively apply cancellation/report/late-completion penalties.
- **Review-reputation interaction**: note review update/delete is now admin-only (from Task 1 of this same follow-up plan) specifically to prevent farming the review-received/five-star bonuses.
- Keep unchanged: `booking_expiry_deduction`'s behavior description, the daily-recovery-job-is-client-only note, `warning_threshold` behavior.

Do not leave any sentence claiming "Default score is 100" as a universal statement — it must now be scoped to client accounts only.

- [ ] **Step 2: Commit**

```bash
git status --short
git add memorybank/reputation.md
git commit -m "docs(reputation): rewrite memory bank doc for the worker reputation rework"
```

---

## Suggested execution order

All 5 tasks are independent and can run in any order / be parallelized across subagents. Task 5 (doc rewrite) is easiest done last since it references outcomes from Task 1 (review immutability) and benefits from the rest being settled first, but nothing technically blocks running it first.
