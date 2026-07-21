# Worker xem hồ sơ khách trước khi nhận booking

**Ngày:** 2026-07-15
**Trạng thái:** Đã duyệt thiết kế, chờ lập plan

## Bối cảnh & mục tiêu

Trong Work Bookings, worker nhận được đơn ở trạng thái `pending` (chờ worker xác
nhận). Hiện worker chỉ thấy tên + SĐT khách (đã populate sẵn trên booking card),
không có thêm tín hiệu tin cậy nào để quyết định **nhận hay từ chối**.

Mục tiêu: cho worker xem một **hồ sơ khách giới hạn** ngay trước khi nhận đơn, mà
**không phá vỡ tính riêng tư** của client profile (hiện `GET /api/user/:id` là
adminOnly, không có endpoint public cho client).

## Nguyên tắc bảo mật (invariant)

- Client profile vẫn private với tất cả. Chỉ worker **đang có đơn `PENDING` với
  đúng khách đó** mới xem được hồ sơ giới hạn này, và chỉ qua booking đó.
- Payload là tập **curated**, KHÔNG lộ: email, phone (thực ra phone đã hiện trên
  card từ populate cũ, nhưng endpoint mới không thêm gì), `client_profile.total_spent`,
  company_name.
- Giới tính khách **không tồn tại** trong data (chỉ `worker_profile.gender` có),
  nên không hiển thị.

## Backend

### Endpoint

`GET /api/bookings/:id/client-profile` — `authenticate` + `workerOnly`.

Kiểm soát quyền trong service:
- Load booking theo `:id`. Nếu không tồn tại → 404.
- Nếu `booking.worker_id !== req.user.id` → 403.
- Nếu `booking.status !== BookingStatus.PENDING` → 403 (chỉ đơn chờ nhận).
- Nếu booking là guest (`client_id` null) → 404 (không có hồ sơ). Trên FE nút
  cũng bị ẩn với guest booking.

### Layering

`routes/booking` → `bookingController.getClientProfileForBooking`
→ `booking-crud.service` (business + authz) → `booking.repository`.

- Dùng `booking.repository.findById` (đã có, populate sẵn) để lấy booking + client.
- Thêm repository method đếm booking theo status của client:
  `countClientBookingStats(clientId)` trả về `{ total, completed, clientCancelled }`
  bằng aggregation trên collection `bookings` với `client_id`:
  - `total` = tổng số booking của client.
  - `completed` = số booking `status = completed`.
  - `clientCancelled` = số booking `status = cancelled` **và**
    `cancellation.cancelled_by = 'client'` (chỉ hủy do chính khách, không tính
    đơn worker từ chối).
- Lấy user client (fields cần thiết) qua user repository hoặc từ booking đã populate;
  cần bổ sung `meta_data.reputation_score`, `verify_email`, `created_at`, `avatar`,
  `full_name` vào select nếu populate hiện tại chưa đủ (populate hiện chỉ có
  `email full_name phone`).

### Response shape

```ts
type BookingClientProfile = {
  full_name: string | null
  avatar: string | null
  member_since: string        // ISO, từ created_at
  is_verified: boolean        // verify_email
  reputation_score: number    // meta_data.reputation_score
  total_count: number
  completed_count: number
  client_cancelled_count: number
}
```

Trả qua helper `R`.

## Frontend

### Data layer

- `services/booking.ts`: `getBookingClientProfile(bookingId): Promise<BookingClientProfile>`
  → `GET /bookings/:id/client-profile`.
- `types/booking.ts`: thêm type `BookingClientProfile`.
- `lib/query-keys.ts`: `bookings.clientProfile(id) => ["bookings","client-profile",id]`.
- Hook `useBookingClientProfile(bookingId, enabled)` (TanStack Query), `enabled`
  chỉ true khi sheet mở → không fetch thừa.

### UI

- `WorkerBookingCard`: thêm nút **"Xem hồ sơ khách"**, CHỈ render khi
  `booking.status === PENDING` và không phải guest booking. Đặt gần khối thông
  tin khách.
- Component mới `CustomerProfileSheet` (Radix Sheet, theo pattern shadcn hiện có):
  hiển thị avatar, tên, "thành viên từ", badge "đã xác thực" (nếu `is_verified`),
  điểm uy tín, "đã hoàn thành X đơn", "tỉ lệ hủy Y%" (tính
  `client_cancelled_count / total_count`, hiện 0% nếu `total_count = 0`). Có
  trạng thái loading (spinner) và error.

### i18n

Thêm keys vào **cả 4** file `messages/{vi,en,zh,ko}.json`, namespace
`WorkerBookings`: `viewCustomerProfile`, `customerProfileTitle`, `memberSince`,
`verifiedBadge`, `reputation`, `completedBookings`, `cancelRate`,
`profileLoadError`.

## Ngoài phạm vi (YAGNI)

- Không thêm trang hồ sơ riêng (đã chọn sheet).
- Không hiển thị email/phone/total_spent/company.
- Không cho xem hồ sơ ở đơn đã confirmed/completed (chỉ PENDING).
- Không đụng flow admin hay client-side.

## Kiểm thử

- Backend: worker có đơn PENDING với khách → 200 + payload đúng; worker khác →
  403; đơn không PENDING → 403; guest booking → 404; non-worker → 403.
- Aggregation: client có mix completed/cancelled(by client)/cancelled(by worker)/
  rejected → `completed_count`, `client_cancelled_count`, `total_count` đúng.
- Frontend: nút chỉ hiện ở đơn PENDING non-guest; sheet fetch khi mở; loading/
  error render đúng; cancel rate = 0% khi total = 0.
