# Điểm uy tín worker: mô hình mới (0 → xây dựng dần, thay vì mặc định 100)

**Ngày:** 2026-08-02
**Trạng thái:** Đã duyệt thiết kế, chờ lập plan

## Bối cảnh & mục tiêu

Bug ban đầu được báo cáo: một worker chưa hoàn tất `/worker/setup` (chưa có
ảnh, chưa điền hồ sơ) vẫn hiển thị **100 điểm uy tín** trên trang cá nhân
công khai — vì `reputation_score` hiện mặc định 100 cho **mọi** tài khoản
(client lẫn worker) và chỉ giảm dần qua các sự kiện xấu
([memorybank/reputation.md](../../../memorybank/reputation.md)). Đây là
hành vi đúng thiết kế hiện tại (default 100, "chưa có gì xấu" ≠ "đã được
xác thực đáng tin"), nhưng gốc rễ sản phẩm là: **worker không cần làm gì
cũng đã trông đáng tin ngang một worker đã hoạt động lâu năm.**

Chủ dự án cung cấp một mô hình tính điểm uy tín mới (ảnh chụp bảng tính) để
thay thế, với nguyên tắc: điểm phải được **xây dựng dần** qua hành động tốt
(hồ sơ đầy đủ, hoàn thành job, review tốt...) thay vì mặc định sẵn.

## Phạm vi

- **Chỉ áp dụng cho worker.** Điểm uy tín của client giữ nguyên 100% hệ
  thống hiện tại — không đổi gì (`client_late_cancel_deduction`, ngưỡng
  chặn booking/đăng bài `reputation < 30`, daily recovery, v.v.).
- Không đổi các ngưỡng `< 30` (đẩy lùi worker trong discovery, chặn client
  đặt lịch worker điểm thấp) — hồ sơ đầy đủ (60đ) đã đủ vượt ngưỡng này
  trước khi cần booking nào, nên không có vấn đề "con gà quả trứng".
- Không đổi `warning_threshold` (70) — cơ chế cảnh báo khi điểm giảm dưới
  ngưỡng vẫn áp dụng nguyên vẹn cho worker với thang điểm mới.
- `booking_expiry_deduction` (worker không xác nhận booking pending đúng
  hạn, -10) **giữ nguyên không đổi** — bảng tính mới không đề cập tình
  huống này, không có gì để thay thế.

## Quyết định chốt (từ brainstorm)

1. **Điểm khởi tạo worker**: 0 (không phải 100). Set tường minh
   `meta_data.reputation_score = 0` tại thời điểm user trở thành worker
   (`POST /api/auth/become-worker`, tạo worker qua admin) — vì Mongoose
   schema-level `default: 100` không thể tuỳ theo role.
2. **Toàn bộ fallback `?? 100`** khi đọc điểm của một **worker** (sort/
   projection trong `worker-service.repository.ts`, worker profile header,
   điều kiện cho phép đặt lịch) đổi thành `?? 0`. Chỗ đọc điểm của
   **client** giữ `?? 100`. Chỗ không rõ role tại thời điểm đọc
   (`comment.service.ts`, `post.service.ts`) phải kiểm tra role trước khi
   chọn giá trị mặc định.
3. **Bỏ hẳn daily recovery cho worker** — `reputation-recovery.job.ts` chỉ
   còn xử lý client. Điểm worker chỉ tăng qua hành động cụ thể.
4. Dùng lại tối đa cơ chế đã có sẵn thay vì tạo state machine song song
   (xem phần Booking bên dưới) — không thêm status `no_show` mới.
5. 3 field hồ sơ mới cần thêm (đều text tự do, cùng kiểu với
   `introduction`/`quote`): `occupation`, `personality`, `marital_status`.

## Bảng quy tắc tính điểm (mới, chỉ áp dụng worker)

| # | Sự kiện | Điểm | Config key mới | Ghi chú |
|---|---|---:|---|---|
| 1 | Có ≥ 5 ảnh trong `gallery_urls` | +10 | `profile_photos_bonus` | Ngưỡng số ảnh: `min_profile_photos_threshold` (không toggle, giống `low_review_threshold`) |
| 2 | Mỗi field trong 10 field hồ sơ có giá trị | +5/field (tối đa +50) | `profile_info_field_bonus` | Xem danh sách field bên dưới |
| 3 | Nhận review mới (bất kỳ rating) | +5 | `review_received_bonus` | Hook vào `reviewService.createReview` |
| 4 | Review rating = 5 | +5 (cộng thêm #3) | `five_star_review_bonus` | |
| 5 | Review rating ≤ `low_review_threshold` (2) | -10 | `low_review_deduction` | Key có sẵn, đổi value 5 → 10 |
| 6 | Booking chuyển `completed` (worker hoàn thành job) | +5 | `job_completion_bonus` | |
| 7 | Report do worker đó nộp được admin resolve `resolved` | +10 | `report_filed_valid_bonus` | `reporter_id` là worker |
| 8 | Report nhắm vào worker đó được resolve `resolved` | -10 | `reported_valid_penalty` | `target_user_id` là worker |
| 9 | Auto-complete booking đã `in_progress`/`pending_client_acceptance` quá hạn (worker quên bấm hoàn thành) | -10 | `late_completion_penalty` | Hook vào `booking-auto-complete.service.ts`, chỉ nhánh "started" |
| 10 | Worker huỷ booking, còn ≥30 phút & <2 tiếng đến giờ hẹn | -10 | `cancel_medium_penalty` | Thay thế `worker_cancel_deduction` |
| 11 | Worker huỷ booking, còn <30 phút đến giờ hẹn | -20 | `cancel_severe_penalty` | Mức mới |
| 12 | Dispute `WORKER_NO_SHOW` được admin resolve `FAVOR_CLIENT` ("bom lịch") | -30 | `cancel_noshow_penalty` | Hook vào `resolveDispute()`, không cần status mới |

10 field tính điểm #2: `introduction`, `date_of_birth`, `height_cm`,
`weight_kg`, `star_sign`, `occupation` (mới), `lifestyle`, `hobbies`,
`personality` (mới), `marital_status` (mới).

Tất cả 9 key mới đều **toggleable** (thêm vào
`TOGGLEABLE_REPUTATION_KEYS`), theo đúng pattern hiện có — admin bật/tắt
và chỉnh value qua `PATCH /api/admin/reputation-config/:key` mà không cần
đổi code.

## Data model

### `worker_profile` — thêm 3 field

`SERVER/src/models/auth/user.model.ts`, cùng khối với `introduction`/`quote`:

```ts
occupation: { type: String, default: null },
personality: { type: String, default: null },
marital_status: { type: String, default: null },
```

Cập nhật cùng lúc: Zod schema (`validations/user/user.validation.ts`),
types (`types/auth/user.types.ts`), form `/worker/setup`
(`pr1as-client/app/worker/setup/page.tsx`), và key i18n mới trong cả 4
file `messages/{vi,en,zh,ko}.json`.

### Reputation config — 9 key mới + 2 giá trị đổi

`SERVER/src/types/reputation/reputation-config.types.ts`: thêm 9 giá trị
enum `ReputationConfigKey` tương ứng bảng trên, thêm vào
`REPUTATION_CONFIG_DEFAULTS` và `TOGGLEABLE_REPUTATION_KEYS`. Đổi default
`LOW_REVIEW_DEDUCTION` từ 5 → 10. `seedDefaults()` hiện có tự chèn key
thiếu, không cần thay đổi cơ chế seed.

### Reputation history — reason mới

`SERVER/src/types/reputation/reputation-history.types.ts`, thêm vào
`ReputationHistoryReason`: `profile_completeness`, `review_received`,
`five_star_review`, `job_completed`, `report_filed_valid`,
`reported_valid`, `late_completion`, `worker_cancel_medium`,
`worker_cancel_severe`, `worker_no_show`.

### Lưu điểm-thành-phần hồ sơ (để tính delta idempotent)

Hồ sơ đầy đủ là điểm **trạng thái** (có thể tăng lẫn giảm nếu worker sửa/
xoá thông tin), không phải sự kiện một lần — khác các dòng #3-12. Thêm
field ẩn `meta_data.reputation_profile_component: number` (default 0) lưu
điểm hồ sơ đã tính lần gần nhất. Mỗi lần `PATCH /api/auth/profile` đổi
`worker_profile`:

1. Tính lại điểm hồ sơ mới (ảnh + field, tối đa 60).
2. `delta = new_component - meta_data.reputation_profile_component`.
3. Nếu `delta !== 0`: gọi `adjustReputationScore(delta)`, ghi history
   `profile_completeness`, cập nhật `reputation_profile_component = new_component`.

## Booking — dùng lại cơ chế có sẵn, không thêm status mới

Khảo sát cho thấy 2 tình huống khó nhất (#9, #12) đã có cơ chế xử lý sẵn
gần đúng ý — chỉ cần hook thêm điểm, không cần job hay status mới:

- **#9 (trễ hoàn thành)**: `booking-auto-complete.job.ts` (chạy mỗi 15
  phút) đã tách 2 nhánh trong `completeFinishedBookings()`: nhánh "đã
  start" (`IN_PROGRESS`/`PENDING_CLIENT_ACCEPTANCE`, grace 2 giờ —
  `AUTO_COMPLETE_HOURS`) và nhánh "chưa start" (`CONFIRMED`, grace 3 ngày
  — `AUTO_COMPLETE_UNSTARTED_DAYS`). Chỉ nhánh **đã start** khớp "quên
  hoàn thành đúng giờ" → hook `late_completion_penalty` (-10) tại đây.
  Nhánh "chưa start" giữ nguyên hành vi hiện tại (cho hưởng lợi nghi ngờ,
  không phạt) vì hệ thống không có bằng chứng buổi hẹn đã diễn ra.
- **#12 (bom lịch)**: `DisputeReason.WORKER_NO_SHOW` đã tồn tại trong
  luồng khiếu nại. Hook `cancel_noshow_penalty` (-30) vào
  `BookingDisputeService.resolveDispute()`, điều kiện: `resolution ===
  FAVOR_CLIENT && booking.dispute.reason === WORKER_NO_SHOW`.
- **#10, #11 (huỷ lịch 2 mức)**: hook vào flow huỷ hiện có trong
  `booking-status.service.ts` (nơi đang gọi `worker_cancel_deduction`),
  chỉ khi `cancelled_by === worker`. Tính khoảng cách từ lúc huỷ đến
  `schedule.start_time`: `< 30 phút` → mức nặng (-20); `≥ 30 phút và < 2
  giờ` → mức trung (-10); `≥ 2 giờ` → không trừ. Áp dụng bất kể booking
  đang `pending` hay `confirmed`, giữ nguyên phạm vi của
  `worker_cancel_deduction` cũ. Xoá hẳn `worker_cancel_deduction` khỏi
  danh sách key đang dùng (giữ enum để không vỡ dữ liệu lịch sử, nhưng
  service không còn ghi nhận key này nữa).

## Report — hook vào resolve status

`SERVER/src/controllers/moderation/moderation.controller.ts` (route
`PATCH /api/moderation/admin/reports/:id/status`): khi status mới là
`resolved` **và** status cũ khác `resolved` (tránh xử lý lặp nếu admin
PATCH lại):

1. Lấy role của `report.reporter_id` — nếu có role `worker` → +10
   (`report_filed_valid_bonus`, reason `report_filed_valid`).
2. Lấy role của `report.target_user_id` — nếu có role `worker` → -10
   (`reported_valid_penalty`, reason `reported_valid`).
3. Hai bước độc lập nhau — cùng 1 report có thể vừa thưởng người báo cáo
   vừa phạt người bị báo cáo nếu cả hai đều là worker.

## Migration cho worker hiện có

Script backfill một lần (theo pattern `npm run backfill:pricing-vnd`),
tính lại điểm mọi worker hiện có dựa trên dữ liệu **có thể suy ra ngay**
tại thời điểm chạy:

- Điểm hồ sơ (ảnh + field) từ `worker_profile` hiện tại.
- Điểm review: `+5` mỗi review hiện có, `+5` thêm nếu rating = 5, `-10`
  nếu rating ≤ 2 (dùng ngưỡng hiện hành).
- Điểm hoàn thành job: `+5` × số booking `status = completed` hiện có.
- **Không hồi tố** report/huỷ lịch/trễ hoàn thành trong quá khứ — những sự
  kiện này chỉ được tính từ ngày migrate trở đi, vì không thể tái dựng
  chính xác "khi đó thuộc mức nào" từ dữ liệu cũ.
- Clamp kết quả về [0, 100], set `reputation_profile_component` bằng đúng
  điểm hồ sơ vừa tính (để lần update profile tiếp theo tính delta đúng).

Hệ quả cần lưu ý: worker có hồ sơ sơ sài sẽ thấy điểm giảm mạnh so với 100
hiện tại ngay sau migrate — nên có thông báo trước cho worker (nội dung
thông báo nằm ngoài phạm vi kỹ thuật của spec này).

## Ngoài phạm vi (YAGNI)

- Không đổi gì ở hệ thống điểm uy tín của client.
- Không thêm status `no_show` hay job cron mới cho booking.
- Không đổi ngưỡng `warning_threshold`, `< 30` gate, hay
  `booking_expiry_deduction`.
- Không thêm khả năng worker report client (ngoài phạm vi report hiện có:
  chỉ `post` và `worker`).
- Không đổi kiểu dữ liệu 3 field hồ sơ mới thành enum/select — text tự do.

## Edge cases

- Worker xoá bớt thông tin hồ sơ (VD xoá ảnh xuống dưới 5 tấm) → điểm hồ
  sơ giảm, delta âm được áp dụng bình thường qua cùng cơ chế.
- Admin PATCH report status nhiều lần qua lại (`resolved` → `reviewing` →
  `resolved`) → chỉ tính điểm ở lần chuyển **sang** `resolved` từ trạng
  thái khác `resolved`, tránh cộng/trừ lặp.
- User vừa là worker vừa là client (đa vai trò): report/review luôn tính
  theo role của **user bị ảnh hưởng** trong ngữ cảnh đó (`worker_id` của
  booking/review, `target_user_id` của report), không phụ thuộc
  `last_active_role`.
- Booking huỷ bởi worker khi đang `pending` (chưa qua `confirmed`) vẫn áp
  dụng 2 mức phạt theo thời gian, giữ đúng phạm vi hành vi cũ của
  `worker_cancel_deduction`.

## Kiểm thử

- BE unit: tính điểm hồ sơ (đủ ngưỡng ảnh, đủ/thiếu từng field, delta khi
  update nhiều lần liên tiếp không double-count); resolver 2 mức huỷ lịch
  theo mốc 30 phút/2 giờ; hook auto-complete chỉ phạt nhánh "started",
  không phạt nhánh "unstarted"; hook resolveDispute chỉ phạt đúng
  `WORKER_NO_SHOW` + `FAVOR_CLIENT`; report resolve chỉ tính 1 lần dù
  PATCH nhiều lần.
- BE unit: mọi `?? 100` đọc điểm worker đã đổi thành `?? 0` — test riêng
  từng call site (worker discovery sort, worker profile header, booking
  eligibility check).
- Migration script: chạy trên tập dữ liệu mẫu, xác nhận điểm sau migrate
  khớp công thức, clamp đúng [0, 100].
- Manual: tạo worker mới → 0 điểm → điền đủ hồ sơ + 5 ảnh → điểm lên 60 →
  vượt ngưỡng hiện trong discovery; test review 5 sao/review tệ; test
  worker huỷ lịch ở cả 2 mốc thời gian; test dispute no-show đủ luồng từ
  client mở đến admin resolve.
