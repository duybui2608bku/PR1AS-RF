# 5 việc còn lại sau review điểm uy tín worker

**Ngày:** 2026-08-02
**Trạng thái:** Đã duyệt thiết kế, chờ lập plan

## Bối cảnh

Sau khi hoàn tất và merge tính năng "đại tu điểm uy tín worker"
([spec gốc](./2026-08-02-worker-reputation-rework-design.md),
[plan gốc](../plans/2026-08-02-worker-reputation-rework.md)), review toàn
nhánh (Opus) tìm ra 5 lỗ hổng/thiếu sót nằm ngoài phạm vi 16 task ban đầu.
Đã ghi vào `SESSIONS.md` mục 2026-08-02, giờ xử lý tiếp trong phiên này.

## 1. Chặn cày điểm qua sửa/xoá review

**Quyết định**: Client không được sửa (`PATCH /api/reviews/:id`) hay xoá
(`DELETE /api/reviews/:id`) review của chính mình nữa sau khi đã tạo — khoá
hoàn toàn, không cần logic đảo điểm phức tạp. Admin vẫn giữ nguyên quyền
sửa/xoá (phục vụ kiểm duyệt).

Vị trí: `SERVER/src/services/review/review.service.ts`
- `updateReview` (dòng ~263): điều kiện hiện tại
  `if (!isAdmin && !isOwner) throw UNAUTHORIZED` → đổi thành
  `if (!isAdmin) throw UNAUTHORIZED` (bỏ hẳn nhánh `isOwner`).
- `deleteReview` (dòng ~315): tương tự, chỉ admin được xoá.

Đây là thay đổi hành vi tính năng (client trước đây sửa/xoá được review),
cần cập nhật `memorybank/review.md` phần "Update Review"/"Delete Review" và
kiểm tra frontend (`pr1as-client/app/client/bookings/*` hoặc trang review
client) có nút sửa/xoá review không — nếu có, cần ẩn/xoá nút đó.

## 2. Admin dashboard chưa biết 12 config key mới

**Quyết định**: Thêm label/mô tả tiếng Việt thủ công cho 12 key mới, đúng
pattern `CONFIG_META`/`orderedKeys` hiện có trong
`pr1as-client/app/dashboard/reputation-config/page.tsx`. Bỏ
`worker_cancel_deduction` khỏi `orderedKeys` (rule đã chết, không còn code
nào ghi nhận key này nữa — xem spec gốc phần "Booking — dùng lại cơ chế có
sẵn").

Cũng cần đồng bộ `pr1as-client/services/reputation-config.service.ts`:
`ReputationConfigKey` type union và `TOGGLEABLE_REPUTATION_KEYS` array đang
tự định nghĩa lại (không import từ backend) — đã lệch 11 key so với
`SERVER/src/types/reputation/reputation-config.types.ts`. Thêm đủ 12 key
mới vào cả 2 chỗ này.

12 key mới cần label (icon gợi ý, có thể tái dùng icon đã import hoặc thêm
icon mới từ `lucide-react`):

| Key | Label gợi ý | Đơn vị |
| --- | --- | --- |
| `profile_photos_bonus` | Đủ ảnh hồ sơ | điểm |
| `min_profile_photos_threshold` | Số ảnh tối thiểu | ảnh |
| `profile_info_field_bonus` | Mỗi trường thông tin hồ sơ | điểm/trường |
| `review_received_bonus` | Nhận được đánh giá | điểm |
| `five_star_review_bonus` | Đánh giá 5 sao | điểm |
| `job_completion_bonus` | Hoàn thành job | điểm |
| `report_filed_valid_bonus` | Báo cáo vi phạm đúng | điểm |
| `reported_valid_penalty` | Bị báo cáo đúng | điểm |
| `late_completion_penalty` | Trễ hoàn thành | điểm |
| `cancel_medium_penalty` | Huỷ lịch (30p-2h) | điểm |
| `cancel_severe_penalty` | Huỷ lịch (dưới 30p) | điểm |
| `cancel_noshow_penalty` | Bom lịch | điểm |

`min_profile_photos_threshold` không toggleable (giống `low_review_threshold`).

## 3. `updateUserByAdmin` bỏ qua reset điểm + đồng bộ hồ sơ

**Quyết định**: Khi admin sửa user có sẵn thành worker lần đầu (trước đó
không có role `worker`), áp dụng đúng logic `becomeWorker`/`createByAdmin`
đã có: set `meta_data.reputation_score = 0` và
`meta_data.reputation_profile_component = 0`. Sau đó (bất kể lần đầu hay
không), nếu user là worker, gọi `reputationService.syncWorkerProfileCompleteness`
để điểm hồ sơ khớp với `worker_profile` vừa được admin ghi đè.

Vị trí: `SERVER/src/services/user/user.service.ts`, method
`updateUserByAdmin` (dòng ~582-669).

- Bắt `wasWorker = existing.roles.includes(UserRole.WORKER)` trước khi tính
  `roles`/`isWorker` mới.
- Sau khi `userRepository.updateByAdmin(...)` thành công: nếu
  `isWorker && !wasWorker`, gọi
  `userRepository.setReputationScoreAndComponent(userId, 0, 0)` (đã có sẵn
  từ Task 16).
- Vì `user` trả về từ `updateByAdmin` có thể có `meta_data` cũ (chưa phản
  ánh reset vừa làm), fetch lại `userRepository.findById(userId)` trước khi
  gọi `syncWorkerProfileCompleteness` để đảm bảo tính đúng delta.
- Gọi sync fire-and-forget (`void ... .catch(logger.error)`), đặt sau đoạn
  cập nhật worker services hiện có (để `worker_profile` đã chắc chắn ghi
  xong).

## 4. `post.service.ts` còn fallback `?? 100` không phân biệt role

**Quyết định**: Áp dụng đúng pattern đã dùng ở `comment.service.ts`
(Task 7 cũ). `UserRole` đã có sẵn trong import của file.

Vị trí: `SERVER/src/services/post/post.service.ts`, method
`assertUserCanCreatePost` (dòng ~234-236):

```ts
const user = await userRepository.findById(userId);
const defaultPostReputation = user?.roles?.includes(UserRole.WORKER)
  ? 0
  : 100;
const reputation = user?.meta_data?.reputation_score ?? defaultPostReputation;
```

## 5. `memorybank/reputation.md` mô tả sai mô hình cũ

**Quyết định**: Viết lại các phần: Purpose, Score Storage (default 0 cho
worker / 100 cho client), Config (12 key mới), bảng Deduction/Addition
Events (12 quy tắc), phần Booking (dùng lại auto-complete + dispute thay vì
job/status mới), Migration. Giữ nguyên các phần không đổi (client-side:
`client_late_cancel_deduction`, `booking_expiry_deduction`,
`daily_recovery_points` chỉ áp dụng client, `warning_threshold`).

## Ngoài phạm vi

- Không đổi hành vi report/reply review (worker vẫn reply được).
- Không thêm UI hiển thị 3 field hồ sơ mới (`occupation`/`personality`/
  `marital_status`) ở trang worker profile công khai — đã có ở form setup,
  hiển thị công khai là việc khác, không nằm trong review findings.
- Không tự động render config UI theo API (đã quyết định thêm tay).

## Kiểm thử

- `review.service.ts`: test `updateReview`/`deleteReview` bị chặn khi
  không phải admin, kể cả khi gọi bởi chính client sở hữu review.
- `user.service.ts`: test `updateUserByAdmin` reset điểm về 0 khi
  `!wasWorker && isWorker`, không reset khi đã là worker từ trước, và gọi
  sync profile completeness trong cả 2 trường hợp.
- `post.service.ts`: test `assertUserCanCreatePost` dùng fallback 0 cho
  user có role worker, 100 cho user không có role worker.
- Frontend admin config: kiểm tra thủ công (không có test tự động cho
  trang này trong repo) — mở `/dashboard/reputation-config`, xác nhận đủ
  19 key hiển thị đúng nhãn, `worker_cancel_deduction` không còn xuất hiện.
