# Worker View Client Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho worker xem một hồ sơ khách giới hạn (avatar, tên, thành viên từ, đã xác thực, uy tín, lịch sử booking) từ một sheet trong Work Bookings, chỉ với đơn đang `pending` chờ worker nhận.

**Architecture:** Thêm 1 endpoint backend `GET /api/bookings/:id/client-profile` (authenticate + workerOnly) với authz chặt trong service (chỉ worker sở hữu đơn PENDING, non-guest). Backend theo layering route → controller → booking-crud service → repository. Frontend thêm data layer (type/service/query-key/hook) và một `CustomerProfileSheet` (BottomSheet) mở từ nút trên `WorkerBookingCard`.

**Tech Stack:** Node + Express + TypeScript + Mongoose (backend, jest unit tests với mocked repositories); Next.js 16 + React 19 + TanStack Query + Tailwind + shadcn/ui BottomSheet (frontend, không có test runner → verify bằng `npm run typecheck` + `npm run lint`).

## Global Constraints

- Backend `tsconfig` strict + `noUnusedLocals` + `noUnusedParameters` + `noImplicitReturns` — không để import/param thừa hoặc build fail.
- Backend responses phải đi qua helper `R` (`utils/response`), không gọi `res.json` trực tiếp.
- Frontend style: không semicolons; chỉ Tailwind classes; early returns; `const` arrow functions có type; event handlers prefix `handle*`; kèm accessibility attributes.
- i18n: thêm key vào **cả 4** file `pr1as-client/messages/{vi,en,zh,ko}.json`. `vi` là default.
- Bảo mật (invariant): payload KHÔNG chứa email, phone, `total_spent`, `company_name`. Chỉ worker sở hữu đơn `PENDING` non-guest mới xem được.
- Commits: Conventional Commits, imperative, không dấu chấm cuối.

---

## File Structure

**Backend**
- Modify `SERVER/src/repositories/booking/booking.repository.ts` — thêm `countClientBookingStats`.
- Modify `SERVER/src/types/booking/booking.types.ts` — thêm type `BookingClientProfile` (kiểm tra file tồn tại; nếu type booking nằm nơi khác, đặt cạnh `IBookingDocument`).
- Modify `SERVER/src/services/booking/booking-crud.service.ts` — thêm `getClientProfileForBooking`.
- Create `SERVER/src/services/booking/booking-crud.client-profile.test.ts` — unit test authz + mapping.
- Modify `SERVER/src/services/booking/booking.service.ts` — bind method mới.
- Modify `SERVER/src/controllers/booking/booking.controller.ts` — thêm `getClientProfileForBooking`.
- Modify `SERVER/src/routes/booking/booking.routes.ts` — thêm route GET `/:id/client-profile`.

**Frontend**
- Modify `pr1as-client/types/booking.ts` — thêm type `BookingClientProfile`.
- Modify `pr1as-client/services/booking.service.ts` — thêm `getBookingClientProfile`.
- Modify `pr1as-client/lib/query-keys.ts` — thêm `bookings.clientProfile`.
- Modify `pr1as-client/lib/hooks/use-bookings.ts` — thêm `useBookingClientProfile`.
- Create `pr1as-client/app/worker/bookings/components/customer-profile-sheet.tsx` — sheet hiển thị hồ sơ.
- Modify `pr1as-client/app/worker/bookings/components/worker-booking-card.tsx` — thêm nút "Xem hồ sơ khách".
- Modify `pr1as-client/app/worker/bookings/page.tsx` — state + render sheet.
- Modify `pr1as-client/messages/{vi,en,zh,ko}.json` — keys `WorkerBookings`.

---

## Task 1: Backend — repository aggregation `countClientBookingStats`

**Files:**
- Modify: `SERVER/src/repositories/booking/booking.repository.ts`

**Interfaces:**
- Consumes: model `Booking`, `BookingStatus`, `Types` (đã import sẵn trong file).
- Produces: `bookingRepository.countClientBookingStats(clientId: string): Promise<{ total: number; completed: number; clientCancelled: number }>`

- [ ] **Step 1: Thêm method vào class `BookingRepository`**

Đặt cạnh các method count khác (gần dòng ~62). `BookingStatus` và `Types` đã được import ở đầu file — kiểm tra và không thêm import trùng.

```ts
async countClientBookingStats(clientId: string): Promise<{
  total: number;
  completed: number;
  clientCancelled: number;
}> {
  const [row] = await Booking.aggregate<{
    total: number;
    completed: number;
    clientCancelled: number;
  }>([
    { $match: { client_id: new Types.ObjectId(clientId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ["$status", BookingStatus.COMPLETED] }, 1, 0],
          },
        },
        clientCancelled: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", BookingStatus.CANCELLED] },
                  { $eq: ["$cancellation.cancelled_by", "client"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return {
    total: row?.total ?? 0,
    completed: row?.completed ?? 0,
    clientCancelled: row?.clientCancelled ?? 0,
  };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd SERVER && npx tsc --noEmit`
Expected: PASS (không lỗi mới trong booking.repository.ts).

- [ ] **Step 3: Commit**

```bash
git add SERVER/src/repositories/booking/booking.repository.ts
git commit -m "feat(booking): add client booking stats aggregation"
```

---

## Task 2: Backend — service `getClientProfileForBooking` + unit test (TDD)

**Files:**
- Modify: `SERVER/src/types/booking/booking.types.ts`
- Modify: `SERVER/src/services/booking/booking-crud.service.ts`
- Test: `SERVER/src/services/booking/booking-crud.client-profile.test.ts`

**Interfaces:**
- Consumes: `bookingRepository.findById(id)` (populate sẵn client_id với `email full_name phone`), `bookingRepository.countClientBookingStats(clientId)` (Task 1), `userRepository.findById(id)` trả `IUserDocument` (có `avatar`, `full_name`, `verify_email`, `created_at`, `meta_data.reputation_score`).
- Produces: `bookingCrudService.getClientProfileForBooking(bookingId: string, workerId: string): Promise<BookingClientProfile>`; type `BookingClientProfile`.

- [ ] **Step 1: Thêm type `BookingClientProfile`**

Trong `SERVER/src/types/booking/booking.types.ts`, thêm:

```ts
export interface BookingClientProfile {
  full_name: string | null;
  avatar: string | null;
  member_since: string;
  is_verified: boolean;
  reputation_score: number;
  total_count: number;
  completed_count: number;
  client_cancelled_count: number;
}
```

- [ ] **Step 2: Viết test thất bại**

Tạo `SERVER/src/services/booking/booking-crud.client-profile.test.ts`. Mock cả hai repository theo pattern có sẵn trong `booking-auto-complete.service.test.ts`.

```ts
import { BookingCrudService } from "./booking-crud.service";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { BookingStatus } from "../../constants/booking";
import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../constants/httpStatus";

jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: {
    findById: jest.fn(),
    countClientBookingStats: jest.fn(),
  },
}));
jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: {
    findById: jest.fn(),
  },
}));

const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const service = new BookingCrudService();

const WORKER_ID = "6512aaaa0000000000000001";
const CLIENT_ID = "6512bbbb0000000000000002";

const bookingDoc = (over: Record<string, unknown> = {}) =>
  ({
    _id: { toString: () => "booking1" },
    worker_id: { toString: () => WORKER_ID },
    client_id: { _id: { toString: () => CLIENT_ID }, toString: () => CLIENT_ID },
    status: BookingStatus.PENDING,
    ...over,
  }) as never;

const clientUser = {
  _id: { toString: () => CLIENT_ID },
  full_name: "Nguyen Van A",
  avatar: "https://cdn/x.png",
  verify_email: true,
  created_at: new Date("2025-01-02T03:04:05.000Z"),
  meta_data: { reputation_score: 87 },
} as never;

beforeEach(() => jest.clearAllMocks());

it("returns a curated client profile for the owning worker on a PENDING booking", async () => {
  bookingRepo.findById.mockResolvedValue(bookingDoc());
  userRepo.findById.mockResolvedValue(clientUser);
  bookingRepo.countClientBookingStats.mockResolvedValue({
    total: 10,
    completed: 6,
    clientCancelled: 2,
  });

  const result = await service.getClientProfileForBooking("booking1", WORKER_ID);

  expect(result).toEqual({
    full_name: "Nguyen Van A",
    avatar: "https://cdn/x.png",
    member_since: "2025-01-02T03:04:05.000Z",
    is_verified: true,
    reputation_score: 87,
    total_count: 10,
    completed_count: 6,
    client_cancelled_count: 2,
  });
});

it("throws 404 when the booking does not exist", async () => {
  bookingRepo.findById.mockResolvedValue(null);
  await expect(
    service.getClientProfileForBooking("missing", WORKER_ID)
  ).rejects.toMatchObject({ statusCode: HTTP_STATUS.NOT_FOUND });
});

it("throws 403 when the requester is not the booking's worker", async () => {
  bookingRepo.findById.mockResolvedValue(bookingDoc());
  await expect(
    service.getClientProfileForBooking("booking1", "9999999999999999999999ff")
  ).rejects.toMatchObject({ statusCode: HTTP_STATUS.FORBIDDEN });
});

it("throws 403 when the booking is not PENDING", async () => {
  bookingRepo.findById.mockResolvedValue(
    bookingDoc({ status: BookingStatus.CONFIRMED })
  );
  await expect(
    service.getClientProfileForBooking("booking1", WORKER_ID)
  ).rejects.toMatchObject({ statusCode: HTTP_STATUS.FORBIDDEN });
});

it("throws 404 for a guest booking with no client_id", async () => {
  bookingRepo.findById.mockResolvedValue(bookingDoc({ client_id: null }));
  await expect(
    service.getClientProfileForBooking("booking1", WORKER_ID)
  ).rejects.toBeInstanceOf(AppError);
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

Run: `cd SERVER && npx jest src/services/booking/booking-crud.client-profile.test.ts`
Expected: FAIL — `getClientProfileForBooking is not a function`.

- [ ] **Step 4: Implement method trong `BookingCrudService`**

Thêm import type ở đầu `booking-crud.service.ts` (gộp vào import type booking sẵn có):

```ts
import {
  AdminBookingAnalytics,
  AdminBookingAnalyticsQuery,
  CreateBookingInput,
  BookingQuery,
  IBookingDocument,
  BookingClientProfile,
} from "../../types/booking/booking.types";
```

Thêm method vào class (đặt gần `getBookingById`). `bookingRepository`, `userRepository`, `AppError`, `ErrorCode`, `HTTP_STATUS`, `BOOKING_MESSAGES`, `BookingStatus` đều đã import sẵn.

```ts
async getClientProfileForBooking(
  bookingId: string,
  workerId: string
): Promise<BookingClientProfile> {
  const booking = await bookingRepository.findById(bookingId);
  if (!booking) {
    throw new AppError(
      BOOKING_MESSAGES.BOOKING_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ErrorCode.NOT_FOUND
    );
  }

  const bookingWorkerId =
    booking.worker_id && typeof booking.worker_id === "object"
      ? (booking.worker_id as { toString(): string }).toString()
      : String(booking.worker_id);
  if (bookingWorkerId !== workerId) {
    throw new AppError(
      BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
      HTTP_STATUS.FORBIDDEN,
      ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
    );
  }

  if (booking.status !== BookingStatus.PENDING) {
    throw new AppError(
      BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
      HTTP_STATUS.FORBIDDEN,
      ErrorCode.BOOKING_UNAUTHORIZED_ACCESS
    );
  }

  const clientRef = booking.client_id as
    | { _id?: { toString(): string }; toString(): string }
    | null;
  if (!clientRef) {
    throw new AppError(
      BOOKING_MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ErrorCode.NOT_FOUND
    );
  }
  const clientId = clientRef._id
    ? clientRef._id.toString()
    : clientRef.toString();

  const [client, stats] = await Promise.all([
    userRepository.findById(clientId),
    bookingRepository.countClientBookingStats(clientId),
  ]);
  if (!client) {
    throw new AppError(
      BOOKING_MESSAGES.USER_NOT_FOUND,
      HTTP_STATUS.NOT_FOUND,
      ErrorCode.NOT_FOUND
    );
  }

  return {
    full_name: client.full_name ?? null,
    avatar: client.avatar ?? null,
    member_since: new Date(client.created_at).toISOString(),
    is_verified: Boolean(client.verify_email),
    reputation_score: client.meta_data?.reputation_score ?? 100,
    total_count: stats.total,
    completed_count: stats.completed,
    client_cancelled_count: stats.clientCancelled,
  };
}
```

Lưu ý: nếu `ErrorCode.BOOKING_UNAUTHORIZED_ACCESS` không tồn tại, dùng đúng tên có trong `src/types/common/error.types.ts` (đã thấy dùng ở `createBooking`). Kiểm tra trước khi viết.

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `cd SERVER && npx jest src/services/booking/booking-crud.client-profile.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Verify typecheck**

Run: `cd SERVER && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add SERVER/src/types/booking/booking.types.ts SERVER/src/services/booking/booking-crud.service.ts SERVER/src/services/booking/booking-crud.client-profile.test.ts
git commit -m "feat(booking): add client profile lookup service with authz"
```

---

## Task 3: Backend — bind service, controller, route

**Files:**
- Modify: `SERVER/src/services/booking/booking.service.ts`
- Modify: `SERVER/src/controllers/booking/booking.controller.ts`
- Modify: `SERVER/src/routes/booking/booking.routes.ts`

**Interfaces:**
- Consumes: `bookingCrudService.getClientProfileForBooking` (Task 2), `extractUserIdFromRequest`, `R`, `BOOKING_MESSAGES`, `workerOnly`, `authenticate`.
- Produces: `GET /api/bookings/:id/client-profile` → `R.success` với `BookingClientProfile`.

- [ ] **Step 1: Bind method trong `booking.service.ts`**

Thêm dòng cạnh `getBookingById = this.crud.getBookingById.bind(this.crud);`:

```ts
  getClientProfileForBooking = this.crud.getClientProfileForBooking.bind(this.crud);
```

- [ ] **Step 2: Thêm controller method**

Trong `booking.controller.ts`, thêm cạnh `getBookingById`:

```ts
async getClientProfileForBooking(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userId = extractUserIdFromRequest(req);
  const { id } = req.params;
  const result = await bookingService.getClientProfileForBooking(id, userId);
  R.success(res, result, BOOKING_MESSAGES.BOOKING_FETCHED, req);
}
```

- [ ] **Step 3: Thêm route**

Trong `booking.routes.ts`, thêm import `workerOnly` vào dòng import từ `../../middleware/auth`:

```ts
import { adminOnly, authenticate, workerOnly } from "../../middleware/auth";
```

Thêm route TRƯỚC route `GET /:id` (rõ ràng hơn; không bắt buộc vì path 2 segment khác 1 segment, nhưng đặt trên cho dễ đọc):

```ts
router.get(
  "/:id/client-profile",
  authenticate,
  workerOnly,
  asyncHandler<AuthRequest>(
    bookingController.getClientProfileForBooking.bind(bookingController)
  )
);
```

- [ ] **Step 4: Verify typecheck + lint**

Run: `cd SERVER && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Manual smoke (nếu server chạy được)**

Với worker đăng nhập sở hữu một đơn PENDING id `<BID>`:
Run: `curl -s -H "Authorization: Bearer <WORKER_TOKEN>" http://localhost:3000/api/bookings/<BID>/client-profile`
Expected: JSON `success: true`, `data` chứa `full_name`, `member_since`, `completed_count`... KHÔNG có email/phone.

- [ ] **Step 6: Commit**

```bash
git add SERVER/src/services/booking/booking.service.ts SERVER/src/controllers/booking/booking.controller.ts SERVER/src/routes/booking/booking.routes.ts
git commit -m "feat(booking): expose client-profile endpoint for booking worker"
```

---

## Task 4: Frontend — data layer (type, service, query key, hook)

**Files:**
- Modify: `pr1as-client/types/booking.ts`
- Modify: `pr1as-client/services/booking.service.ts`
- Modify: `pr1as-client/lib/query-keys.ts`
- Modify: `pr1as-client/lib/hooks/use-bookings.ts`

**Interfaces:**
- Produces:
  - type `BookingClientProfile` (khớp payload backend Task 2).
  - `bookingService.getBookingClientProfile(bookingId: string): Promise<BookingClientProfile>`
  - `queryKeys.bookings.clientProfile(id: string)`
  - `useBookingClientProfile(bookingId: string | null, enabled: boolean)`

- [ ] **Step 1: Thêm type**

Trong `pr1as-client/types/booking.ts`:

```ts
export type BookingClientProfile = {
  full_name: string | null
  avatar: string | null
  member_since: string
  is_verified: boolean
  reputation_score: number
  total_count: number
  completed_count: number
  client_cancelled_count: number
}
```

- [ ] **Step 2: Thêm service function**

Trong `pr1as-client/services/booking.service.ts`: thêm `BookingClientProfile` vào import type từ `@/types/booking`, thêm function, và export trong object `bookingService`.

```ts
const getBookingClientProfile = async (
  bookingId: string
): Promise<BookingClientProfile> => {
  const response = await api.get<ApiResponse<BookingClientProfile>>(
    `/bookings/${bookingId}/client-profile`
  )
  if (!response.data.data) {
    throw new Error("Missing client profile in response")
  }
  return response.data.data
}
```

Thêm `getBookingClientProfile` vào object `bookingService` được export ở cuối file (theo cách các function khác được gom).

- [ ] **Step 3: Thêm query key**

Trong `pr1as-client/lib/query-keys.ts`, trong block `bookings`, sau `detail`:

```ts
    clientProfile: (id: string) =>
      ["bookings", "client-profile", id] as const,
```

- [ ] **Step 4: Thêm hook**

Trong `pr1as-client/lib/hooks/use-bookings.ts`: đảm bảo `useQuery`, `queryKeys`, `bookingService` đã import; thêm:

```ts
export function useBookingClientProfile(
  bookingId: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: queryKeys.bookings.clientProfile(bookingId ?? ""),
    queryFn: () => bookingService.getBookingClientProfile(bookingId!),
    enabled: Boolean(enabled && bookingId),
    staleTime: 60_000,
  })
}
```

- [ ] **Step 5: Verify typecheck**

Run: `cd pr1as-client && npx tsc --noEmit`
Expected: PASS (bỏ qua lỗi cũ không liên quan `.next/dev/types/validator.ts` về `quick-booking`).

- [ ] **Step 6: Commit**

```bash
git add pr1as-client/types/booking.ts pr1as-client/services/booking.service.ts pr1as-client/lib/query-keys.ts pr1as-client/lib/hooks/use-bookings.ts
git commit -m "feat(booking): add client-profile query hook and service"
```

---

## Task 5: Frontend — `CustomerProfileSheet` component + i18n

**Files:**
- Create: `pr1as-client/app/worker/bookings/components/customer-profile-sheet.tsx`
- Modify: `pr1as-client/messages/vi.json`
- Modify: `pr1as-client/messages/en.json`
- Modify: `pr1as-client/messages/zh.json`
- Modify: `pr1as-client/messages/ko.json`

**Interfaces:**
- Consumes: `useBookingClientProfile` (Task 4), `getBookingId` (`../format`), `BottomSheet*` (`@/components/ui/bottom-sheet`), `Booking` type.
- Produces: `CustomerProfileSheet` component với props `{ open: boolean; booking: Booking | null; onOpenChange: (open: boolean) => void }`.

- [ ] **Step 1: Thêm i18n keys vào cả 4 file, namespace `WorkerBookings`**

Tìm object `"WorkerBookings"` trong mỗi file và thêm các key sau (giữ nguyên các key hiện có).

`messages/vi.json`:
```json
"viewCustomerProfile": "Xem hồ sơ khách",
"customerProfileTitle": "Hồ sơ khách hàng",
"memberSince": "Thành viên từ {date}",
"verifiedBadge": "Đã xác thực",
"reputation": "Điểm uy tín",
"completedBookings": "Đã hoàn thành {count} đơn",
"cancelRate": "Tỉ lệ hủy {rate}%",
"profileLoadError": "Không tải được hồ sơ khách"
```

`messages/en.json`:
```json
"viewCustomerProfile": "View customer profile",
"customerProfileTitle": "Customer profile",
"memberSince": "Member since {date}",
"verifiedBadge": "Verified",
"reputation": "Reputation",
"completedBookings": "{count} completed bookings",
"cancelRate": "Cancel rate {rate}%",
"profileLoadError": "Could not load customer profile"
```

`messages/zh.json`:
```json
"viewCustomerProfile": "查看客户资料",
"customerProfileTitle": "客户资料",
"memberSince": "注册于 {date}",
"verifiedBadge": "已验证",
"reputation": "信誉分",
"completedBookings": "已完成 {count} 个预约",
"cancelRate": "取消率 {rate}%",
"profileLoadError": "无法加载客户资料"
```

`messages/ko.json`:
```json
"viewCustomerProfile": "고객 프로필 보기",
"customerProfileTitle": "고객 프로필",
"memberSince": "{date}부터 회원",
"verifiedBadge": "인증됨",
"reputation": "신뢰도",
"completedBookings": "완료된 예약 {count}건",
"cancelRate": "취소율 {rate}%",
"profileLoadError": "고객 프로필을 불러오지 못했습니다"
```

- [ ] **Step 2: Tạo component `customer-profile-sheet.tsx`**

```tsx
"use client"

import * as React from "react"
import Image from "next/image"
import { BadgeCheck, Loader2, ShieldCheck, User2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet"
import { Badge } from "@/components/ui/badge"
import { useBookingClientProfile } from "@/lib/hooks/use-bookings"
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"
import { type Booking } from "@/types/booking"

import { getBookingId } from "../format"

type CustomerProfileSheetProps = {
  open: boolean
  booking: Booking | null
  onOpenChange: (open: boolean) => void
}

export function CustomerProfileSheet({
  open,
  booking,
  onOpenChange,
}: CustomerProfileSheetProps) {
  const t = useTranslations("WorkerBookings")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale] ?? INTL_LOCALE_TAGS.vi
  const bookingId = booking ? getBookingId(booking) : null
  const { data, isLoading, isError } = useBookingClientProfile(bookingId, open)

  const cancelRate =
    data && data.total_count > 0
      ? Math.round((data.client_cancelled_count / data.total_count) * 100)
      : 0
  const memberSince = data
    ? new Intl.DateTimeFormat(localeTag, {
        year: "numeric",
        month: "long",
      }).format(new Date(data.member_since))
    : ""

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetTitle>{t("customerProfileTitle")}</BottomSheetTitle>
        <BottomSheetDescription className="sr-only">
          {t("customerProfileTitle")}
        </BottomSheetDescription>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError || !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("profileLoadError")}
          </p>
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex items-center gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                {data.avatar ? (
                  <Image
                    src={data.avatar}
                    alt={data.full_name ?? ""}
                    width={64}
                    height={64}
                    className="size-16 object-cover"
                  />
                ) : (
                  <User2 className="size-7 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <span className="truncate">{data.full_name ?? "—"}</span>
                  {data.is_verified ? (
                    <BadgeCheck className="size-5 shrink-0 text-primary" />
                  ) : null}
                </p>
                {memberSince ? (
                  <p className="text-sm text-muted-foreground">
                    {t("memberSince", { date: memberSince })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.is_verified ? (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <ShieldCheck className="size-3.5" />
                  {t("verifiedBadge")}
                </Badge>
              ) : null}
              <Badge variant="secondary" className="rounded-full">
                {t("reputation")}: {data.reputation_score}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-card p-4">
                <p className="text-2xl font-semibold">{data.completed_count}</p>
                <p className="text-xs text-muted-foreground">
                  {t("completedBookings", { count: data.completed_count })}
                </p>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <p className="text-2xl font-semibold">{cancelRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {t("cancelRate", { rate: cancelRate })}
                </p>
              </div>
            </div>
          </div>
        )}
      </BottomSheetContent>
    </BottomSheet>
  )
}

CustomerProfileSheet.displayName = "CustomerProfileSheet"
```

Lưu ý: nếu avatar host chưa nằm trong `next.config` `images.remotePatterns`, dùng `<img>` thay `next/image` (kiểm tra cách `avatar` được render ở chỗ khác trong app để theo đúng convention — ví dụ component avatar hiện có). Nếu app đã có `Avatar` primitive từ shadcn, ưu tiên dùng nó.

- [ ] **Step 3: Verify typecheck**

Run: `cd pr1as-client && npx tsc --noEmit`
Expected: PASS (bỏ qua lỗi `quick-booking` cũ).

- [ ] **Step 4: Commit**

```bash
git add pr1as-client/app/worker/bookings/components/customer-profile-sheet.tsx pr1as-client/messages/vi.json pr1as-client/messages/en.json pr1as-client/messages/zh.json pr1as-client/messages/ko.json
git commit -m "feat(booking): add customer profile sheet for worker bookings"
```

---

## Task 6: Frontend — wire button vào card + page

**Files:**
- Modify: `pr1as-client/app/worker/bookings/components/worker-booking-card.tsx`
- Modify: `pr1as-client/app/worker/bookings/page.tsx`

**Interfaces:**
- Consumes: `CustomerProfileSheet` (Task 5), `isGuestBooking` (`../format`), `BookingStatus` (`@/types/booking`).
- Produces: prop mới `onViewCustomerProfile?: (booking: Booking) => void` trên `WorkerBookingCard`.

- [ ] **Step 1: Thêm prop + nút vào `WorkerBookingCard`**

Thêm vào `WorkerBookingCardProps`:

```ts
  onViewCustomerProfile?: (booking: Booking) => void
```

Nhận prop trong signature component (`onViewCustomerProfile`). Thêm import icon `Eye` từ `lucide-react` (gộp vào import lucide sẵn có). `isGuestBooking` và `BookingStatus` đã import sẵn trong file.

Trong `InfoRow` khối customer (sau `</InfoRow>` của khách, khoảng dòng 104), thêm nút — chỉ hiện khi đơn PENDING, non-guest, và có handler:

```tsx
{onViewCustomerProfile &&
booking.status === BookingStatus.PENDING &&
!isGuestBooking(booking) ? (
  <button
    type="button"
    onClick={() => onViewCustomerProfile(booking)}
    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
  >
    <Eye className="size-4" />
    {t("viewCustomerProfile")}
  </button>
) : null}
```

- [ ] **Step 2: Wire vào page.tsx**

Trong `app/worker/bookings/page.tsx`:

a) Import component (cạnh import `WorkerBookingCard`):
```ts
import { CustomerProfileSheet } from "./components/customer-profile-sheet"
```

b) Thêm state cạnh `const [sheetBooking, setSheetBooking] = React.useState<Booking | null>(null)`:
```ts
const [profileBooking, setProfileBooking] = React.useState<Booking | null>(null)
```

c) Truyền prop vào `<WorkerBookingCard ... />` (khối ~717):
```tsx
onViewCustomerProfile={setProfileBooking}
```

d) Render sheet cạnh `<WorkerBookingActionSheet ... />` (khối ~944):
```tsx
<CustomerProfileSheet
  open={profileBooking !== null}
  booking={profileBooking}
  onOpenChange={(open) => {
    if (!open) setProfileBooking(null)
  }}
/>
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `cd pr1as-client && npx tsc --noEmit && npm run lint`
Expected: PASS (bỏ qua lỗi `quick-booking` cũ).

- [ ] **Step 4: Manual verification (chạy app)**

- Đăng nhập worker có một đơn `pending`. Vào `/worker/bookings`.
- Card đơn pending có nút "Xem hồ sơ khách"; đơn confirmed/completed và đơn guest KHÔNG có nút.
- Bấm nút → sheet mở, hiển thị avatar/tên/thành viên từ/uy tín/số đơn hoàn thành/tỉ lệ hủy. KHÔNG có email/phone.
- Kiểm tra hiển thị ở cả 4 ngôn ngữ (đổi locale) không vỡ layout.

- [ ] **Step 5: Commit**

```bash
git add pr1as-client/app/worker/bookings/components/worker-booking-card.tsx pr1as-client/app/worker/bookings/page.tsx
git commit -m "feat(booking): show customer profile button on pending worker bookings"
```

---

## Self-Review

**Spec coverage:**
- Endpoint có authz PENDING + owner + workerOnly → Task 2 (service), Task 3 (route workerOnly). ✓
- Payload curated (không email/phone/total_spent) → Task 2 mapping. ✓
- Booking stats (completed, client cancel rate) → Task 1 aggregation + Task 5 tính rate. ✓
- Guest booking ẩn nút / 404 → Task 2 (guard) + Task 6 (`!isGuestBooking`). ✓
- Sheet từ card, chỉ PENDING → Task 5 + Task 6. ✓
- i18n 4 locale → Task 5. ✓
- Bỏ giới tính (không có data) → không map trong Task 2. ✓

**Placeholder scan:** Không có TBD/TODO; mỗi step có code/command cụ thể. Hai điểm "kiểm tra tên/convention" (ErrorCode name, avatar rendering) là hướng dẫn xác minh danh tính symbol có thật, không phải placeholder logic.

**Type consistency:** `BookingClientProfile` (BE `booking.types.ts` / FE `types/booking.ts`) cùng field names snake_case; `getClientProfileForBooking(bookingId, workerId)` khớp giữa service/binding/controller; `useBookingClientProfile(bookingId, enabled)` khớp giữa hook và call site trong sheet; `getBookingId` dùng cho query key + component. ✓
