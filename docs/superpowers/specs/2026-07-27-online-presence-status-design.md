# Hiển thị trạng thái online / online cách đây bao lâu

**Ngày:** 2026-07-27
**Trạng thái:** Đã duyệt thiết kế, chờ lập plan

## Bối cảnh & mục tiêu

Cần hiển thị trạng thái "đang online" hoặc "hoạt động cách đây bao lâu" cho
mọi user (client + worker) ở 3 nơi: màn hình chat, trang chủ dịch vụ (danh
sách worker), và bài viết (social feed). Hiện tại:

- Backend đã có sẵn Map in-memory `userSockets` +
  [socket.handlers.ts](../../SERVER/src/config/socket.handlers.ts)
  `isUserOnline(userId)`, nhưng không dùng ở đâu ngoài nội bộ chat, và không
  có field "last seen" nào được lưu DB.
- Frontend đã có 1 socket kết nối gần như toàn site: `NotificationBell`
  (trong `SiteLayout`, hiển thị ở hầu hết trang non-admin) gọi
  `useNotificationSocket()` → connect cùng singleton với chat
  ([lib/chat-socket.ts](../../pr1as-client/lib/chat-socket.ts)). Vì vậy
  "có socket đang mở" là proxy đáng tin cho "đang online" với mọi
  client/worker (admin dashboard không có socket, ngoài phạm vi tính năng).
- Không cần Redis/pub-sub: xác nhận backend chạy 1 instance (không PM2
  cluster, không `ioredis` trong dependencies).

## Quyết định chốt (từ brainstorm)

1. **Phạm vi user**: áp dụng cho mọi user (client + worker), không phân
   biệt role, ở cả 3 nơi.
2. **Không có toggle ẩn riêng tư**: luôn hiển thị công khai, không thêm
   setting.
3. **Định dạng thời gian**: bucket tương đối (Đang online / Vừa xong / X
   phút trước / X giờ trước / Hôm qua / X ngày trước...), **ẩn hẳn** nếu
   `last_active_at` quá 30 ngày hoặc `null` (chưa từng có dữ liệu).
4. **Sort worker**: worker đang online được ưu tiên lên đầu, nhưng **chỉ là
   tie-break trong cùng 1 tier boost** — không ghi đè thứ tự
   featured/basic/thường hiện có (bảo toàn giá trị boost trả phí).
5. **Mức độ chi tiết khác nhau theo nơi hiển thị**:
   - Chat (list + header): text đầy đủ ("Đang online" / "Hoạt động 5 phút
     trước") cạnh tên.
   - Worker card & bài viết: chỉ chấm tròn xanh nhỏ khi online, **không hiện
     gì khi offline**; hover/tap chấm mới hiện tooltip last-seen.
6. **Cách cập nhật**: hybrid — realtime qua socket cho chat (nơi đã có hạ
   tầng typing-indicator tương tự); poll định kỳ (~60s) cho worker card và
   bài viết (không cần room mới, tránh over-engineering cho một chấm tròn).

## Backend

### Model

`SERVER/src/models/auth/user.model.ts` — thêm field:

```ts
last_active_at: { type: Date, default: null, index: true }
```

### Cập nhật last_active_at (socket connect/disconnect)

Trong [socket.handlers.ts](../../SERVER/src/config/socket.handlers.ts):

- `registerUserSocket(userId, socketId)`: nếu đây là **socket đầu tiên**
  của user (set trước đó rỗng) → set `last_active_at = now` trong DB (fire
  and forget, không chặn handshake).
- `unregisterUserSocket(userId, socketId)`: nếu đây là **socket cuối cùng**
  bị gỡ (set rỗng sau khi xoá) → set `last_active_at = now`.
- Nhiều tab/thiết bị: chỉ tính chuyển trạng thái khi `Set` rỗng ↔ có phần
  tử, dùng đúng logic đếm hiện có, không đổi hành vi khi vẫn còn tab khác
  mở.

### Batch lookup

Thêm `isUserOnlineBulk(userIds: string[]): Set<string>` cạnh
`isUserOnline` hiện có (đọc trực tiếp từ Map `userSockets`, không query
DB) — dùng cho danh sách worker/bài viết.

`last_active_at` lấy kèm bằng cách thêm vào **projection có sẵn** ở 3 nơi
đã fetch user doc (chat hydrate other_user, worker discovery, post feed
author) — không thêm query DB mới.

### Chat — realtime presence

- Room tái dùng: `user:<userId>` (đã tồn tại, mọi user join khi connect).
- Event mới trong `SERVER/src/constants/socket.ts`:
  `PRESENCE_UPDATE: "presence:update"`, payload:
  ```ts
  { user_id: string, is_online: boolean, last_active_at: string | null }
  ```
- Khi chuyển trạng thái (connect/disconnect như trên):
  1. `conversationRepository.listDirectPartnerIds(userId)` — query mới,
     cùng pattern `$or:[{sender_id},{receiver_id}]` đã dùng ở
     `listConversations`, chỉ project id đối phương.
  2. Với mỗi partner id: `io.to(getUserRoom(partnerId)).emit(PRESENCE_UPDATE, payload)`.
- Chỉ áp dụng cho **direct chat** (có "đối tác" rõ ràng); group chat không
  hiển thị presence tổng hợp — ngoài phạm vi.

### API response thêm field

- `GET /api/chat/conversations`, `GET /api/chat/conversations/:id`: thêm
  `other_user.presence: { is_online, last_active_at }`.
- `WorkerService.getWorkersGroupedByService`: thêm `presence` vào mỗi
  worker (dùng `isUserOnlineBulk`).
- Post feed service (hydrate `author`): thêm `author.presence` tương tự.

### Sort worker

`SERVER/src/services/worker/worker.service.ts` — mở rộng sort key:

```
hiện tại: [tier, scatter]
mới:      [tier, onlineRank, scatter]   // onlineRank = 0 nếu online, 1 nếu không
```

Tier (featured/basic/thường) vẫn là khoá chính; online chỉ tie-break trong
cùng tier; scatter xoay vòng giữ nguyên logic rotation hiện có.

## Frontend

### Component dùng chung

- `components/shared/presence-dot.tsx`: chấm tròn xanh, chỉ hiện khi
  `is_online`; hover/tap hiện tooltip text last-seen (dùng chung hook bên
  dưới). Dùng ở `WorkerCard`
  ([workers-by-service-list.tsx](../../pr1as-client/components/worker/workers-by-service-list.tsx),
  cạnh avatar dòng ~228-241) và `post-card.tsx`
  ([post-card.tsx](../../pr1as-client/components/post/post-card.tsx), cạnh
  `AuthorAvatar` dòng ~479-505).
- `components/shared/presence-text.tsx`: text đầy đủ, dùng ở
  `chat-page.tsx` (conversation list item dòng ~1877-1904, conversation
  header dòng ~1459-1479).
- Hook chung `usePresenceLabel(isOnline, lastActiveAt)`:
  ```ts
  if (isOnline) return t("online")
  if (!lastActiveAt) return null
  const diff = now - lastActiveAt
  if (diff < 1min)  return t("justNow")
  if (diff < 1hour) return t("minutesAgo", { n })
  if (diff < 1day)  return t("hoursAgo", { n })
  if (diff < 30day) return t("daysAgo", { n })
  return null // > 30 ngày → ẩn hẳn
  ```
  Text tự làm mới bằng `setInterval` nhẹ (~30-60s) để "5 phút trước" tự
  chuyển "6 phút trước" mà không cần refetch API.
- i18n: thêm namespace `Presence` (`online`, `justNow`, `minutesAgo`,
  `hoursAgo`, `daysAgo`...) vào cả 4 file `messages/{vi,en,zh,ko}.json`.

### Nhận socket event (chat only)

`lib/hooks/use-chat-socket.ts` thêm listener `presence:update`, cập nhật
cache TanStack Query của conversation list/detail tương ứng — cùng cách
`new_message`/`message_read` đang cập nhật cache hiện tại.

### Poll định kỳ (worker card & bài viết)

- Hook danh sách worker và `use-posts.ts`: thêm `refetchInterval: 60_000`
  (TanStack Query tự dừng khi tab ẩn, không cần xử lý thêm). Chỉ áp dụng
  cho trang danh sách/feed đang mount, không phá cursor pagination của
  infinite scroll (chỉ refetch/invalidate nhẹ, không reset trang).

## Ngoài phạm vi (YAGNI)

- Không có toggle ẩn trạng thái online (luôn công khai).
- Không hiển thị presence cho group chat.
- Không áp dụng cho tài khoản admin.
- Không dùng Redis/pub-sub (single instance).
- Không đổi logic boost/rotation hiện có, chỉ thêm 1 khoá sort phụ.

## Edge cases

- User chưa từng connect socket kể từ khi tính năng ra mắt → `last_active_at
  = null` → không hiển thị gì (không phải "offline mãi mãi").
- Server crash đột ngột (không graceful shutdown): một số user có thể bị
  "kẹt" ở trạng thái online trong Map cho tới khi client tự reconnect và
  trigger lại — chấp nhận được, tự phục hồi, không xử lý thêm.

## Kiểm thử

- BE unit: `isUserOnlineBulk`, `listDirectPartnerIds`; sort key mở rộng
  đảm bảo tier vẫn ưu tiên trước online; emit `presence:update` chỉ gửi
  đúng partner rooms và chỉ khi thực sự chuyển trạng thái (không emit khi
  còn tab khác mở).
- FE unit: `usePresenceLabel` cho từng bucket + ngưỡng ẩn 30 ngày +
  trường hợp `null`.
- Manual: 2 trình duyệt (2 tài khoản có hội thoại), tắt/mở tab 1 bên →
  bên kia cập nhật realtime ở cả list và header; worker card/bài viết đổi
  chấm sau tối đa ~60s; kiểm tra sort worker online không vượt qua tier
  boost cao hơn; 4 ngôn ngữ không vỡ layout.
