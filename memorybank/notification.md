# Notification System

## Tổng quan

Notification system là module domain dùng chung cho các tính năng hiện có: booking, wallet/escrow, dispute, review và chat. Hệ thống hỗ trợ in-app realtime qua Socket.IO, lịch sử thông báo trong MongoDB, email qua Nodemailer và browser push qua Web Push.

## Backend Components

### Models (`SERVER/src/models/notification/`)
- `Notification`: nguồn dữ liệu chính cho in-app notification, unread count, trạng thái read/archive, `dedupe_key`, delivery status.
- `NotificationPreference`: tùy chọn kênh theo user (`in_app`, `email`, `push`) và danh sách notification type bị mute.
- `PushSubscription`: lưu browser push subscription theo user.
- `NotificationDeliveryLog`: audit trạng thái gửi từng kênh.

### Services (`SERVER/src/services/notification/`)
- `notification.service.ts`: API nghiệp vụ chính để tạo, list, mark read, preferences và push subscriptions.
- `notification-events.service.ts`: helper cho feature services gọi notification theo event nghiệp vụ.
- `adapters/`: tách delivery adapters cho Socket.IO, Nodemailer và Web Push.

### Routes

Base path: `/api/notifications`

- `GET /` - danh sách notification có pagination/filter.
- `GET /unread-count` - số notification chưa đọc.
- `PATCH /:id/read` - đánh dấu một notification đã đọc.
- `PATCH /read-all` - đánh dấu tất cả đã đọc.
- `GET/PATCH /preferences` - lấy/cập nhật preferences.
- `GET /push-public-key` - public VAPID key cho browser push.
- `POST /push-subscriptions` - lưu push subscription.
- `DELETE /push-subscriptions/:id` - deactivate push subscription.

## Frontend Components

- `CLIENT/lib/api/notification.api.ts`: REST API client.
- `CLIENT/lib/hooks/use-notifications.ts`: React Query hooks cho list/count/preferences/mutations.
- `CLIENT/lib/stores/notification.store.ts`: unread count và realtime state nhẹ.
- `CLIENT/lib/components/notification-provider.tsx`: lắng nghe socket events toàn app và hiện toast realtime.
- `CLIENT/lib/components/notification-bell.tsx`: badge/popover ở header.
- `CLIENT/app/notifications/page.tsx`: notification center và preferences.
- `CLIENT/public/notification-sw.js`: service worker nhận Web Push.

## Integration Points

- Booking: create/status/cancel/dispute created/resolved.
- Wallet/Escrow: deposit success/fail, hold, refund, payout.
- Review: created/updated.
- Chat: tạo notification khi receiver không active trong conversation/group room.

## Environment Variables

Backend push notification cần:

```env
WEB_PUSH_VAPID_SUBJECT=mailto:no-reply@example.com
WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
```

Nếu thiếu VAPID keys, push delivery sẽ được skip và log lại, không làm fail nghiệp vụ.
