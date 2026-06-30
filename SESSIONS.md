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

## 2026-06-30 — Fix: booking 1 phần ngày khóa cả ngày của worker

**Mục tiêu**: Client đặt vài giờ trong ngày của worker nhưng frontend khóa cả
ngày → client khác không đặt được giờ trống còn lại.

**Nguyên nhân**: Backend so trùng đúng theo khoảng giờ (half-open overlap,
`checkScheduleConflict`) — ĐÚNG. Nhưng frontend `computeBookedDays` quét
nguyên cả ngày: chỉ cần 1 booking bất kỳ là disable cả ngày. Lỗi lặp ở **4**
surface: `book-worker-dialog`, `quick-booking-dialog`, `quick-booking-wizard`,
`worker-calendar`.

**Đã làm**:
- Tạo module dùng chung `pr1as-client/lib/booking-availability.ts`:
  `computeBookedIntervals` / `rangeHasConflict` (mirror backend half-open) /
  `computeBlockedHours` (giờ bắt đầu bị trùng theo unit×quantity) /
  `classifyDays` (fully vs partially booked, probe 1h).
- 4 component: chỉ disable ngày **fully booked**; ngày partial vẫn chọn được
  (modifier amber "còn vài khung giờ"); dropdown giờ disable đúng slot đã đặt;
  thêm validation overlap theo [start,end) thật.
- Mở rộng `components/ui/date-picker.tsx` thêm prop `disabledMatchers`.
- i18n 4 locale: thêm `WorkerProfile.calendar.legendPartial`,
  `WorkerProfile.book.errSlotTaken` + `slotTaken`, `QuickBooking.slotTaken`.
  Bổ sung luôn các key legend còn thiếu sẵn trong `ko.json`.
- Cập nhật `memorybank/booking.md` (đoạn mô tả hành vi cũ đã sai).

**File chính**: `lib/booking-availability.ts`, `components/worker/{book-worker-dialog,
quick-booking-dialog,worker-calendar}.tsx`, `app/quick-booking/quick-booking-wizard.tsx`,
`components/ui/date-picker.tsx`, `messages/{vi,en,zh,ko}.json`

**Quyết định / ghi chú**: "Fully booked" probe bằng slot 1h nên độc lập
unit/quantity (lịch profile chưa chọn unit). `npm run typecheck` pass; lint
không phát sinh lỗi mới (các cảnh báo còn lại là của code cũ). Đã test logic
module bằng script (9/9 PASS) — gồm đúng kịch bản bug.

**Còn lại**: Chưa kiểm thử E2E trên trình duyệt (cần worker có booking 1 phần
ngày trong DB để thấy rõ). Logic đã verify bằng unit test.

**Commit**: chưa commit · branch `main`

---

## 2026-06-30 — Chuẩn hóa footer theo loại trang (desktop)

**Mục tiêu**: Rà soát client bản desktop, xác định page nào cần footer / không cần,
rồi sửa cho nhất quán.

**Nguyên tắc**: trang public/marketing/pháp lý → có footer; trang app đã đăng
nhập / giao dịch / dashboard → ẩn footer (`SiteLayout hideFooter`). Footer vốn
chỉ render từ `md` trở lên; mobile dùng bottom-nav nên không đổi.

**Đã làm** (5 chỗ lệch chuẩn):
- `/pricing`: bỏ `hideFooter` → hiện footer (đồng bộ với about/services/booking-process).
- `/worker/boost`: thêm `hideFooter` → ẩn (trang app của worker).
- `/wallet`, `/wallet/deposit`: thêm `hideFooter` → ẩn (giao dịch, đã đăng nhập).
- `/client/*` (qua `client/layout.tsx`): thêm `hideFooter` → ẩn cho toàn khu client app.

**File chính**: `pr1as-client/app/pricing/page.tsx`, `app/worker/boost/page.tsx`,
`app/wallet/page.tsx`, `app/wallet/deposit/page.tsx`, `app/client/layout.tsx`

**Quyết định / ghi chú**: `/booking-lookup` và `/quick-booking` giữ footer vì là
flow public. Các trang không dùng `SiteLayout` (chat, dashboard, (auth), notifications)
vốn đã không có footer — không đụng. `npm run typecheck` pass.

**Còn lại**: không

**Commit**: chưa commit · branch `main`

---

## 2026-06-30 — Tạm ẩn trang + modal Trách nhiệm pháp lý

**Mục tiêu**: Tạm thời ẩn trang `/legal-responsibility` và modal nhắc trách
nhiệm pháp lý.

**Đã làm**:
- Modal `LegalResponsibilityModal`: thêm cờ `HIDDEN = true` + `if (HIDDEN)
  return null` (giữ nguyên toàn bộ logic, bật lại = đổi 1 dòng).
- Trang `/legal-responsibility`: `if (HIDDEN) notFound()` → trả 404, nội dung
  gốc giữ nguyên.
- Ẩn link dẫn tới trang để tránh nút bấm → 404: comment item trong
  `config/nav.ts` (footer "Pháp lý") và `infoLinks` trong `settings/page.tsx`
  (kèm comment import icon `Scale` để khỏi unused).

**File chính**: `pr1as-client/components/providers/legal-responsibility-modal.tsx`,
`pr1as-client/app/legal-responsibility/page.tsx`, `pr1as-client/config/nav.ts`,
`pr1as-client/app/settings/page.tsx`

**Quyết định / ghi chú**: Dùng cờ `HIDDEN`/comment thay vì xoá code để bật lại
dễ. Typecheck pass. Lint còn 1 lỗi `set-state-in-effect` ở modal là pre-existing
(dòng 75, không đụng tới). i18n keys + provider wiring giữ nguyên.

**Còn lại**: không (chờ yêu cầu bật lại).

**Commit**: chưa commit · branch `main`

---

## 2026-06-30 — Sửa spam email nhắc lịch booking (mỗi 10 phút)

**Mục tiêu**: Email nhắc thời gian booking bị gửi lại mỗi 10 phút cho cùng một
booking.

**Đã làm**:
- Root cause: job `booking-reminder` chạy `*/10 * * * *`, query
  `findUpcomingBookingsForReminder` chỉ lọc theo cửa sổ thời gian (24h/1h) nên
  mỗi tick chọn lại cùng booking. `dedupe_key` chỉ chặn trùng **dòng**
  notification (unique index) nhưng `notify()` vẫn gọi `dispatchChannels()`
  **vô điều kiện** → email/push re-dispatch mỗi 10 phút.
- Fix tại tầng notification (lợi cho mọi luồng dùng dedupe_key):
  `createNotification` giờ trả `{ notification, created }`, dùng
  `includeResultMetadata` để phân biệt insert mới vs. khớp dòng cũ
  (`lastErrorObject.updatedExisting`). `notify()` chỉ `dispatchChannels` khi
  `created === true`. Nhánh retry E11000 → `created: false` (racer thua không
  gửi lại). Job và query giữ nguyên.

**File chính**: `SERVER/src/repositories/notification/notification.repository.ts`,
`SERVER/src/services/notification/notification.service.ts`

**Quyết định / ghi chú**: `dedupe_key` nay mang nghĩa "deliver đúng một lần"
trên mọi kênh — nhất quán với tất cả call site (đều unique theo sự kiện/người
nhận). Đánh đổi: nếu lần gửi đầu thất bại (provider down) sẽ không retry; chấp
nhận được, spam nghiêm trọng hơn nhiều so với mất 1 retry. Không cần dọn dữ
liệu: booking đang trong cửa sổ đã có sẵn row → tick sau khớp → ngừng gửi ngay
khi deploy. Typecheck pass; 3 lỗi lint còn lại ở dòng destructuring
`_updatedAt/_link` là pre-existing, không thuộc thay đổi này.

**Còn lại**: không.

**Commit**: chưa commit · branch `main`

---

## 2026-06-29 — Gỡ currency switcher sidebar admin + ẩn user hệ thống tạo

**Mục tiêu**: (1) Bỏ section "Tiền tệ hiển thị" trong sidebar admin; (2) Danh
sách quản lý user không hiển thị tài khoản do admin/hệ thống tạo
(`created_by_admin`).

**Đã làm**:
- **Sidebar admin** (`admin-dashboard-shell.tsx`): xoá block `CurrencyOptions`
  ("Tiền tệ hiển thị") ở `SidebarFooter` + import không dùng.
- **Ẩn hoàn toàn user hệ thống tạo**: backend `userRepository.findAllWithFilters`
  giờ **luôn** thêm `created_by_admin: { $ne: true }` (bỏ nhánh param). Gỡ param
  `created_by_admin` khỏi `getUsersQuerySchema` + `GetUsersQuery` DTO. Frontend:
  xoá filter "Nguồn tài khoản" (SOURCE_OPTIONS + Select + state/reset), bỏ
  `createdByAdmin` khỏi `GetUsersParams` + query.

**File chính**: `SERVER/src/{repositories/auth/user.repository.ts,validations/user/user.validation.ts,types/user/user.dto.ts}`,
`pr1as-client/{components/layout/admin-dashboard-shell.tsx,services/user.service.ts,app/dashboard/users/page.tsx}`

**Quyết định / ghi chú**: User chọn "ẩn hoàn toàn" (không chỉ default). Endpoint
chi tiết/sửa user theo ID vẫn truy cập được — chỉ danh sách bị lọc. Badge
`user.created_by_admin` trong bảng còn nhưng không bao giờ render (vô hại).

**Còn lại**: không.

**Commit**: chưa commit · branch `main`

---

## 2026-06-29 — Trang About chỉnh sửa được bởi Admin (CMS đa ngôn ngữ)

**Mục tiêu**: Cho phép Admin sửa nội dung trang `/about`; giữ layout hard-code,
chỉ đổi text, đa ngôn ngữ, dùng rich text editor; có fallback mặc định.

**Đã làm**:
- **Backend module `about`** (singleton, theo khuôn `site-settings`): model với
  sub-schema localized `{vi,en,zh,ko}` (+ `minimize:false`), types, constants
  `ABOUT_DEFAULTS` (seed + reset, mirror nội dung 4 ngôn ngữ trong
  `messages/*.json`), zod validation, repository (get+seed lazy, update
  **deep-merge** giữ locale khác, reset), service, controller, routes:
  `GET /api/about` (public) + `PATCH`/`POST /reset` (adminOnly + csrf). Thêm
  `models.name.ABOUT_CONTENT`. HTML tự sanitize qua `sanitizeInput` global.
- **Frontend**: `services/about.service.ts` (+normalize/empty shape),
  `lib/about-server.ts` (SSR fetch revalidate 60s + fallback rỗng),
  `lib/hooks/use-about-content.ts`, query key `about`.
- **Trang public `app/about/page.tsx`**: giữ nguyên layout/icon, nạp content DB
  qua `getServerAboutContent` + `pickLocalized`, **fallback từng field về
  next-intl messages**; render HTML bằng `RichText` (unwrap `<p>` cho
  heading/inline). `what.paragraphs` → field rich `what.body`.
- **Trang admin `app/dashboard/about/page.tsx`**: Tabs theo section, mọi field
  dùng TipTap (chọn ngôn ngữ global, editor remount theo `key`), badge "Chưa
  lưu", lưu từng section, thêm/bớt item cho why/features, dialog reset. Thêm nav
  "Trang giới thiệu" vào `admin-dashboard-shell`.

**File chính**: `SERVER/src/{models,types,constants,validations,repositories,services,controllers,routes}/about*`,
`pr1as-client/{app/about/page.tsx,app/dashboard/about/page.tsx,services/about.service.ts,lib/about-server.ts,lib/hooks/use-about-content.ts}`

**Quyết định / ghi chú**: Tất cả field là rich HTML (theo yêu cầu); fallback 3
lớp = seed DB → SSR fail-safe → message từng field. Trang admin theo convention
hard-code tiếng Việt như `dashboard/settings` (không thêm key i18n mới). Lint
rule `react-hooks/set-state-in-effect` đã có sẵn ở `settings/page.tsx`; trang
about dùng pattern sync-khi-render nên lint sạch.

**Còn lại**: Chưa chạy thử runtime (cần Mongo). Cân nhắc on-demand
`revalidatePath('/about')` sau khi lưu nếu muốn cập nhật tức thì (hiện 60s).

**Commit**: chưa commit · branch `main`

---

## 2026-06-29 — Vá tiếp luồng AUTH (refresh race, reset, rate-limit, XSS)

**Mục tiêu**: Review lại reset-password + login + logout + refresh; sửa hết lỗi
phát hiện được.

**Đã làm**:
- **#1 Refresh-token reuse giả khi refresh đồng thời** (bug logout oan): rotation
  giờ giữ `previous_refresh_token_hash` + `refresh_token_rotated_at` và chấp nhận
  token-ngay-trước trong grace window `REFRESH_TOKEN.REUSE_GRACE_MS` (15s). Hai
  tab/thiết bị cùng refresh bằng cùng cookie không còn bị revoke nhầm. Tách
  `signAuthTokens()` (thuần) khỏi `generateAuthTokens()`; thêm `timingSafeEqualHex`
  và `userRepository.rotateRefreshTokenHash()` (pipeline update, `$$NOW`).
  `clearRefreshToken`/`setRefreshTokenHash`/`resetPassword` đều clear field grace.
- **#5 Reset xong vẫn EMAIL_NOT_VERIFIED**: `resetPassword` repo nay set
  `verify_email: true` (+ clear verification token) — click link reset đã chứng
  minh sở hữu inbox.
- **#6 Email báo đổi mật khẩu**: thêm `passwordChangedTemplate` + i18n
  `email.passwordChanged.*`; gửi fire-and-forget sau reset thành công.
- **#8 Rate-limit email**: nới `emailActionLimiter` theo IP (3→15, đỡ chặn nhầm
  IP/NAT dùng chung) + thêm `emailRecipientLimiter` (khoá theo email, 4/giờ) cho
  forgot-password & resend-verification (chống bom mail 1 địa chỉ qua xoay IP).
- **#2 (một phần) refresh token khỏi sessionStorage**: bỏ persist `refreshToken`
  trong `auth-store` partialize (vẫn giữ memory làm body-fallback). Thu hẹp bề
  mặt XSS mà không phá cookie-only refresh.
- **#9 retry_after cho lockout**: `AppError` thêm field `retryAfter` +
  `AppError.tooManyRequests()`; errorHandler trả `error.retry_after` (giây) +
  header `Retry-After`. Login tính số giây còn lại từ `locked_until`. Frontend:
  `ApiError.retryAfter`, login page hiển thị i18n `Auth.accountLocked` với số phút
  (key thêm cho en/vi/ko/zh).

**File chính**: `SERVER/src/services/auth/auth.service.ts`,
`SERVER/src/repositories/auth/user.repository.ts`, `SERVER/src/utils/token.ts`,
`SERVER/src/models/auth/user.model.ts`, `SERVER/src/middleware/rateLimiter.ts`,
`SERVER/src/utils/{template-mail,i18n}.ts`, `SERVER/src/constants/app.ts`,
`pr1as-client/lib/store/auth-store.ts`

**Quyết định / ghi chú**: Grace window dùng top-level `previous_*` thay vì mảng
session vì vẫn là mô hình single refresh token. Guard `!user.refresh_token_hash`
chạy TRƯỚC logic grace nên logout/reset/delete (null current hash) vẫn revoke
tuyệt đối. Không gửi email khi tài khoản bị lock (failed-login) vì có thể bị lạm
dụng để bom mail nạn nhân.

**Còn lại** (cần quyết định product/infra, chưa làm):
- **#3 Đa thiết bị/đa phiên**: hiện 1 refresh hash/user → đăng nhập máy mới đá
  máy cũ. Cần refactor sang mảng session (thêm `sid` vào JWT) — đổi data model.
- **#2 (đủ)**: gỡ hẳn refresh token khỏi JS / route qua proxy same-origin — phụ
  thuộc topology domain prod (same-site vs cross-site + chặn third-party cookie).
- **#4 sâu**: lockout vẫn cho phép DoS có chủ đích lên nạn nhân (cần CAPTCHA /
  khoá theo account+IP). **#7**: vô nghĩa ở mô hình single-token, gộp vào #3.

**Commit**: chưa commit · branch `main`

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
