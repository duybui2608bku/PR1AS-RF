# Ưu tiên worker mới tạo trong xếp hạng discovery

**Ngày:** 2026-08-14
**Trạng thái:** Đã duyệt thiết kế, chờ lập plan

## Bối cảnh & mục tiêu

Hiện tại thứ tự hiển thị worker trong danh sách discovery (`GET
/api/workers/grouped-by-service`) được quyết định bởi:

1. DB-level: gát `reputation_score < 30` bị đẩy xuống đáy (không loại bỏ),
   trong mỗi nhóm sort theo `reputation_score` giảm dần
   ([worker-service.repository.ts:637-660](../../SERVER/src/repositories/worker/worker-service.repository.ts)).
2. In-memory: sort theo `[tier, onlineRank, scatter]`
   ([worker.service.ts:184-199](../../SERVER/src/services/worker/worker.service.ts)) —
   boost tier trước, rồi online status, rồi scatter xoay vòng ngẫu nhiên
   theo `rotation_interval_minutes` (mặc định 30 phút).

Endpoint `GET /api/workers/search-by-hashtag`
([worker-service.repository.ts:761-854](../../SERVER/src/repositories/worker/worker-service.repository.ts))
dùng logic đơn giản hơn và độc lập: chỉ `$sort: { reputation_score: -1, id: 1
}` ở DB-level, không có boost/online, phân trang bằng `$facet` +
`$skip`/`$limit`.

Mục tiêu: worker mới tạo hồ sơ được ưu tiên hiển thị lên trước — không phải
bằng cách chèn riêng một "ưu đãi worker mới" tạm thời, mà bằng cách bổ sung
`created_at` như một khoá sort trong một cascade đầy đủ hơn, áp dụng thống
nhất cho cả hai endpoint.

## Quyết định chốt (từ brainstorm)

1. **Thứ tự cascade đầy đủ** (khoá sau chỉ dùng khi khoá trước bằng nhau):

   ```
   1. boost tier          featured(1) < basic(2) < không boost(999)
   2. gát reputation        bình thường(0) < bị flag <30(1)
   3. trạng thái online      online(0) < offline(1)
   4. completed_bookings     giảm dần
   5. average_rating         giảm dần
   6. reputation_score       giảm dần
   7. created_at             giảm dần (mới nhất trước)
   8. scatter                công thức rotation hiện có (tiebreak cuối)
   ```

   Không cần cờ `is_new`/khung thời gian riêng: worker mới tạo (0 booking,
   0 rating, `reputation_score` mặc định 100 — xác nhận tại
   [user.model.ts:210](../../SERVER/src/models/auth/user.model.ts), luôn
   ≥ 30 nên không rơi vào gát reputation) tự nhiên xếp theo độ mới khi so
   với các worker khác có chỉ số bằng nhau ở khoá 1-6.

2. **Gát reputation giữ nguyên là override độc lập** — đặt ngay sau boost
   tier, trước online status. Worker bị flag `reputation_score < 30` không
   thể vượt lên nhờ nhiều booking/sao, dù cascade mới có ưu tiên các chỉ số
   đó.

3. **Áp dụng cho cả 2 endpoint** (`grouped-by-service` và
   `search-by-hashtag`) để tránh lệch hành vi giữa hai luồng discovery.

4. **Cách lấy `average_rating`/`completed_bookings`**: tính tại thời điểm
   query bằng `$lookup` vào `Review`/`Booking` (cùng pattern đã dùng ở
   `getWorkerSuggestions` /
   [worker-service.repository.ts:350-448](../../SERVER/src/repositories/worker/worker-service.repository.ts)),
   **không** denormalize field mới lên `User` model. Đơn giản, không cần
   sửa write-path (review service, booking completion job); chấp nhận
   đánh đổi là aggregation nặng hơn — có thể tối ưu sau (denormalize) nếu
   phát sinh vấn đề hiệu năng thực tế.

5. **Không thêm badge/nhãn "Mới" ở UI.** Phạm vi thuần backend — chỉ đổi
   thứ tự trả về, không thêm field hiển thị mới cho frontend.

## Bug phát hiện khi khảo sát (sửa kèm)

`searchWorkersByHashtag` hiện dùng
`reputation_score: { $first: "$worker.reputation_score" }`
([worker-service.repository.ts:799](../../SERVER/src/repositories/worker/worker-service.repository.ts)) —
thiếu tiền tố `meta_data.`. Vì field thật là
`worker.meta_data.reputation_score`
([user.model.ts:208-214](../../SERVER/src/models/auth/user.model.ts)),
biểu thức trên luôn resolve `undefined` → `$ifNull` fallback về `0` → toàn
bộ `$sort: { reputation_score: -1, id: 1 }` hiện tại là no-op, kết quả chỉ
thực sự sort theo `id`. Sửa thành `"$worker.meta_data.reputation_score"`
như một phần của thay đổi này.

## Backend

### Comparator dùng chung

Mở rộng `getWorkerBoostSortKey`
([worker.service.ts:184-199](../../SERVER/src/services/worker/worker.service.ts))
thành một hàm mới, ví dụ `getWorkerRankingSortKey(worker, boostByWorkerId,
onlineWorkerIds, slotId)`, trả về mảng 8 phần tử theo đúng thứ tự cascade ở
trên. Dùng chung cho cả `getWorkersGroupedByService` và `searchByHashtag`
để không lệch logic giữa hai nơi.

```ts
type RankingInput = {
  id: string
  reputation_score: number
  completed_bookings: number
  average_rating: number
  created_at: Date | null
}

const getWorkerRankingSortKey = (
  worker: RankingInput,
  boostByWorkerId: Map<string, Boost>,
  onlineWorkerIds: Set<string>,
  slotId: number,
) => {
  const boost = boostByWorkerId.get(worker.id)
  const tier = boost ? boost.tier : 999
  const reputationGate = worker.reputation_score < 30 ? 1 : 0
  const onlineRank = onlineWorkerIds.has(worker.id) ? 0 : 1
  const scatter = (parseInt(worker.id.slice(-4), 16) + slotId) % 1000
  return [
    tier,
    reputationGate,
    onlineRank,
    -worker.completed_bookings,
    -worker.average_rating,
    -worker.reputation_score,
    worker.created_at ? -worker.created_at.getTime() : 0,
    scatter,
  ]
}
```

(Giảm dần được biểu diễn bằng dấu trừ để giữ comparator là so sánh mảng
tăng dần đơn giản, nhất quán với cách `scatter` đang so sánh.)

### `findWorkersGroupedByService`

- Thêm `$lookup`/`$group` vào `Review` và `Booking` (pattern giống
  `getWorkerSuggestions`) trong
  [worker-service.repository.ts](../../SERVER/src/repositories/worker/worker-service.repository.ts),
  tính `average_rating`, `completed_bookings` per worker.
- Thêm `worker.created_at` và 2 field trên vào stage `$group`/`$push`
  hiện tại (dòng 661-695).
- Giữ nguyên `$addFields`/`$sort` theo `_reputation_priority` +
  `reputation_score` ở DB-level (dòng 637-660) — chỉ để tạo thứ tự khởi
  điểm hợp lý trước khi group; thứ tự cuối cùng do comparator in-memory
  quyết định.
- `WorkerService.getWorkersGroupedByService`
  ([worker.service.ts:501-657](../../SERVER/src/services/worker/worker.service.ts)):
  thay lời gọi sort hiện tại bằng `getWorkerRankingSortKey`, truyền thêm
  `completed_bookings`/`average_rating`/`created_at` đã có từ aggregation.

### `searchWorkersByHashtag`

- Sửa bug field path `reputation_score` (mục "Bug phát hiện" ở trên).
- Thêm `$lookup` vào `Review`/`Booking` giống trên; thêm `created_at` vào
  `$project`.
- Thêm bước annotate boost + online (hiện chưa có ở endpoint này):
  `workerBoostRepository.findActiveBoostsForWorkers` +
  `boostConfigRepository.get()` + `isUserOnlineBulk`, cùng cách
  `WorkerService.getWorkersGroupedByService` đang làm.
- **Bỏ** `$sort`/`$facet` với `$skip`/`$limit` ở DB-level. Lý do: boost và
  online không thể đánh giá trong DB và có độ ưu tiên cao hơn mọi chỉ số
  khác — nếu vẫn phân trang ở DB trước khi overlay boost/online, một
  worker đang boost có thể "kẹt" ở trang 2 thay vì trồi lên trang 1.
  Thay vào đó: aggregation trả về toàn bộ candidate đã lọc (`is_active`,
  hashtag, service active), sort bằng `getWorkerRankingSortKey` trong
  service layer, rồi cắt trang bằng `array.slice(skip, skip + limit)`.
  Cùng pattern với `getWorkersGroupedByService` (vốn đã fetch không giới
  hạn từ trước), nên không phải tiền lệ mới trong codebase.
- `total` cho phân trang lấy từ `candidates.length` sau khi lọc (trước khi
  slice), thay vì `$count` riêng trong `$facet`.

## Ngoài phạm vi (YAGNI)

- Không thêm field/badge "Mới" cho frontend.
- Không denormalize `average_rating`/`completed_bookings` lên `User`
  model (Approach B bị loại — xem mục 4 ở trên).
- Không thêm khung thời gian "mới trong N ngày" — `created_at` là khoá
  sort liên tục, không phải cờ nhị phân có hạn.
- Không đổi logic boost/rotation/scatter hiện có, không đổi ngưỡng gát
  reputation `< 30`.

## Edge cases

- Worker mới tạo có `average_rating = 0` (không có review nào) — `$avg`
  trên tập rỗng trả `null`, cần `$ifNull` về `0` như code hiện tại đã làm
  cho pattern tương tự ở suggestions.
- Hai worker có `created_at` giống hệt nhau (hiếm, cùng millisecond) —
  scatter vẫn là tiebreak cuối cùng, đảm bảo thứ tự ổn định.
- `searchWorkersByHashtag` sau khi bỏ `$skip`/`$limit` ở DB cần đảm bảo
  các `$match` lọc sớm (is_active, hashtag regex, service active) vẫn giữ
  nguyên để không fetch toàn bộ bảng worker — chỉ bỏ phân trang, không bỏ
  lọc.

## Kiểm thử

- BE unit: `getWorkerRankingSortKey` — kiểm tra từng khoá đúng thứ tự ưu
  tiên (boost thắng tất cả; gát reputation thắng online/stats; cascade
  booking→rating→reputation→created_at đúng chiều; scatter là tiebreak
  cuối).
- BE unit: fix bug field path — `searchWorkersByHashtag` trả đúng
  `reputation_score` từ `meta_data`.
- BE integration: `searchWorkersByHashtag` phân trang đúng sau khi chuyển
  sang in-memory slice (tổng số, trang cuối, trang trống).
- Manual: tạo 2 hồ sơ worker mới với chỉ số giống hệt nhau, xác nhận
  worker tạo sau xếp trước trong cùng tier/online; xác nhận worker bị flag
  reputation < 30 vẫn ở đáy dù có nhiều booking/sao.
