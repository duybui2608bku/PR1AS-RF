# Session Log

Nhật ký các phiên làm việc với Claude Code trên repo này. Mục đích: phiên sau
đọc được phiên trước đã chỉnh sửa những gì, quyết định gì, và còn việc gì dang
dở — thứ mà `git log` hay `memorybank/` không nắm hết.

## Cách dùng

- **Đầu phiên**: đọc file này (entry mới nhất nằm trên cùng) để lấy bối cảnh.
- **Sau khi thay đổi code/tài liệu**: thêm một entry mới lên **đầu** danh sách
  theo mẫu bên dưới. Một entry cho mỗi phiên là đủ; cập nhật entry đang mở nếu
  cùng một phiên làm nhiều việc.
- Viết ngắn gọn, tập trung vào **"đã làm gì và vì sao"** + **việc còn lại**.
  Đừng chép lại diff; `git` đã giữ chi tiết dòng.
- Chuyển ngày tương đối thành ngày tuyệt đối (vd. "hôm nay" → `2026-06-27`).
- Trạng thái commit: ghi rõ đã commit hay chưa, và branch nếu khác `main`.

## Mẫu entry

```md
## YYYY-MM-DD — <tiêu đề ngắn>

**Mục tiêu**: <yêu cầu của phiên>

**Đã làm**:
- <thay đổi 1>
- <thay đổi 2>

**File chính**: `path/a`, `path/b`

**Quyết định / ghi chú**: <điều không hiển nhiên cần nhớ>

**Còn lại**: <việc dang dở, hoặc "không">

**Commit**: <hash / "chưa commit"> · branch `<tên>`
```

---

## 2026-06-28 — Rà soát & vá luồng AUTH cho production

**Mục tiêu**: Kiểm tra toàn bộ luồng AUTH client + server, rồi fix các vấn đề
chặn production (#1–#4 trong báo cáo rà soát).

**Đã làm**:
- **#1 trust proxy**: thêm `app.set("trust proxy", config.trustProxy)` trong
  `createApp()`. Trước đó thiếu hoàn toàn → sau reverse proxy/CDN, `req.ip` là IP
  proxy cho mọi request → các rate limiter keyed-IP gộp 1 bucket (5 login sai
  khoá toàn hệ thống). Thêm `config.trustProxy` (env `TRUST_PROXY`, mặc định:
  prod=1, dev=false).
- **#2 JWT_SECRET coupling (Next)**: tạo `lib/auth/jwt-secret.ts#getJwtSecret()`
  — fail-hard (throw → 500) khi prod thiếu `JWT_SECRET` thay vì fallback secret
  dev (vốn khiến mọi verify fail → redirect-loop /login âm thầm). Dùng trong
  `middleware.ts` và `app/api/auth/session/route.ts` (gọi NGOÀI try để lỗi nổi
  lên 500). Lưu ý vận hành: `JWT_SECRET` phải set ở CẢ hai app, cùng giá trị.
- **#3 refresh cho tab khôi phục session**: `lib/axios.ts` interceptor 401 giờ
  thử refresh qua cookie httpOnly khi store thiếu `refreshToken` nhưng vẫn
  `isAuthenticated` (tab mở từ SessionRestoreProvider). Trước đó nó force-logout
  → broadcast → cascade logout mọi tab. Backend đã đọc `cookie ?? body`.
- **#4 FRONTEND_URL**: fail-hard ở prod khi thiếu; sửa default dev `3000`→`3001`
  (đúng cổng client) để link verify/reset email mở đúng app.

**File chính**: `SERVER/src/app.ts`, `SERVER/src/config/index.ts`,
`pr1as-client/lib/auth/jwt-secret.ts` (mới), `pr1as-client/middleware.ts`,
`pr1as-client/app/api/auth/session/route.ts`, `pr1as-client/lib/axios.ts`.

**Quyết định / ghi chú**:
- Backend prettier dùng `endOfLine: crlf`, frontend dùng `lf`. Edit tool ghi LF
  → phải chạy `prettier --write` lại cho file backend (app.ts) để qua eslint.
- Frontend KHÔNG gate prettier trong eslint (file gốc vốn "dirty") → chỉ giữ
  changed lines sạch, không reformat cả file.
- Cả hai app: `tsc --noEmit` pass; eslint trên các file đã sửa pass.

**Còn lại**: Các mục 🟡 trong báo cáo (lockout không reset sau window; token
trong sessionStorage; làm rõ proxy `[...path]` vs axios trực tiếp) chưa xử lý —
đều là hardening, không chặn production. Chưa commit.

**Commit**: chưa commit · branch `main`

## 2026-06-27 — Cập nhật memory bank: worker-question + guest booking

**Mục tiêu**: Đọc memory bank để hiểu mã nguồn, rồi bổ sung các phần còn thiếu.

**Đã làm**: Phát hiện 3 tính năng gần đây chưa được tài liệu hoá và lấp đầy:
- Tạo mới `memorybank/worker-question.md` — module Q&A trên hồ sơ worker
  (route `/api/worker-questions`, commit `8336c05`).
- Bổ sung `memorybank/booking.md` — phần Guest/Quick Booking (`POST /quickbook`,
  `GET /lookup`), trường model guest, email tracking, filter `is_guest`
  (commits `926a7b2`, `9e17570`).
- Đồng bộ các doc tham chiếu: `api-reference.md` (route guest + module
  worker-questions), `project-overview.md` (bảng module + collection
  `worker_question` + ghi chú guest), `notification.md` (category `question` +
  2 type `worker_question.*`), `README.md` (liên kết worker-question.md và
  service-catalog-v2.md vốn bị thiếu), `worker.md` (cross-link Q&A).

**File chính**: `memorybank/worker-question.md` (mới), `memorybank/booking.md`,
`memorybank/api-reference.md`, `memorybank/project-overview.md`,
`memorybank/notification.md`, `memorybank/README.md`, `memorybank/worker.md`.

**Quyết định / ghi chú**:
- Nuance đáng nhớ trong `SERVER/src/services/booking/booking-email.ts`:
  `sendQuickBookingCreatedEmails` luôn gửi email xác nhận cho guest, nhưng chỉ
  gửi email "request" cho worker **khi kênh EMAIL của worker bị tắt** — để tránh
  trùng với email từ notification `bookingCreated`.
- Worker question: chỉ câu trả lời **đầu tiên** mới notify người hỏi; guest
  (không có tài khoản) được email trực tiếp qua `asker_email`.
- Email guest hỗ trợ locale `en/vi/ko/zh` (có `ko`), trong khi i18n frontend chỉ
  `en/vi/zh`.

**Còn lại**: Chưa commit — chờ xác nhận message
(`docs: document worker-question and guest booking in memory bank`).

**Commit**: chưa commit · branch `main`
