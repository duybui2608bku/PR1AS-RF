# Service Catalog v2 — Trợ lý ảo / Trợ lý thực tế

> Status: implemented. Migration auto-runs on server boot (idempotent, lock-guarded).

## Bối cảnh

Trước đây hệ thống có 2 loại dịch vụ (`ServiceCategory`):

- `ASSISTANCE` — trợ lý (VIRTUAL_ASSISTANT, DIRECT_SUPPORT, TRANSLATION)
- `COMPANIONSHIP` — đồng hành (TOUR_GUIDE, PRESENCE, CONNECTION, FORMAL) với `companionship_level` 1–3.

Yêu cầu mới: thay bằng **2 category là Trợ lý ảo (`VIRTUAL`) và Trợ lý thực tế (`PHYSICAL`)**. Mỗi
category gồm cùng một bộ "tên dịch vụ", mỗi tên có mô tả riêng theo từng category. Một số ô bỏ trống
(Pháp lý/Thể thao chỉ có ở `VIRTUAL`; Không chuyên môn chỉ có ở `PHYSICAL`).

## Mô hình dữ liệu

- Mỗi ô (category × tên dịch vụ) **không rỗng** = 1 document `service`. `code` là unique nên dùng
  prefix theo category: `VIRTUAL_<SLUG>` / `PHYSICAL_<SLUG>`.
- Tổng cộng 19 service: 10 ở `VIRTUAL` + 9 ở `PHYSICAL`.
- `companionship_level` và `rules` không còn dùng cho catalog mới (giữ field trong schema để tương
  thích dữ liệu cũ, luôn `null`).
- Catalog là source of truth ở `SERVER/src/constants/service-catalog.ts`.

| SLUG | VI | EN | icon | VIRTUAL | PHYSICAL |
|---|---|---|---|---|---|
| OFFICE_BASIC | Văn phòng cơ bản | Basic Office | FileText | ✅ | ✅ |
| HEALTH | Sức khoẻ | Health | HeartPulse | ✅ | ✅ |
| ART | Nghệ thuật | Performing Arts | Music | ✅ | ✅ |
| FINE_ART | Mỹ thuật | Fine Art | Palette | ✅ | ✅ |
| ENTERTAINMENT | Giải trí | Entertainment | Gamepad2 | ✅ | ✅ |
| KNOWLEDGE | Kiến thức | Knowledge | GraduationCap | ✅ | ✅ |
| TECH | Công nghệ | Tech | Laptop | ✅ | ✅ |
| LEGAL | Pháp lý | Legal | Scale | ✅ | ❌ |
| SPORTS | Thể thao | Sports | Dumbbell | ✅ | ❌ |
| MODELING | Modeling | Modeling | Camera | ✅ | ✅ |
| NON_PROFESSIONAL | Không chuyên môn | General Tasks | Briefcase | ❌ | ✅ |

## Mapping service cũ → mới (giữ tham chiếu worker_service & booking)

| Code cũ | Code mới |
|---|---|
| VIRTUAL_ASSISTANT | VIRTUAL_OFFICE_BASIC |
| DIRECT_SUPPORT | PHYSICAL_OFFICE_BASIC |
| TRANSLATION | PHYSICAL_NON_PROFESSIONAL |
| TOUR_GUIDE | PHYSICAL_ENTERTAINMENT |
| PRESENCE | PHYSICAL_ENTERTAINMENT |
| CONNECTION | PHYSICAL_ENTERTAINMENT |
| FORMAL | PHYSICAL_ENTERTAINMENT |

## Migration (auto-run khi deploy)

`SERVER/src/services/service/service-catalog-migration.service.ts`, gọi trong `src/index.ts` ngay sau
`reputationConfigService.seedDefaults()`.

An toàn:
- **Idempotent**: upsert service theo `code`; remap chỉ chạm bản ghi còn mang code cũ.
- **Marker**: collection `migrations` (model `Migration`) lưu cờ `service-catalog-v2` → đã chạy thì skip.
- **Lock**: bọc trong `withJobLock("migration:service-catalog-v2")` (an toàn multi-instance).
- **Dedupe**: nếu 1 worker có nhiều service cũ map về cùng 1 service mới → gộp, repoint
  `booking.worker_service_id` sang bản giữ lại trước khi xoá bản trùng (worker_service KHÔNG có
  unique index DB trên (worker_id, service_id)).

Trình tự: ① upsert 19 service mới → ② remap `worker_service` (+dedupe+repoint) → ③ remap `booking`
→ ④ set `is_active=false` cho 7 service cũ.

## Các chỗ phụ thuộc enum/category (đã đồng bộ)

- BE: `types/service/service.type.ts` (enum), `validations/service`, `repositories/worker/worker-service.repository.ts`.
- FE: `lib/home/home-search-params.ts` (ServiceTab), `lib/store/services-header-store.ts`,
  `components/hero/home-hero.tsx`, `components/layout/site-header.tsx`,
  `components/home/home-search-experience.tsx`, `lib/navigation/role-routes.ts`,
  `lib/worker/worker-setup-catalog.ts`, `app/worker/setup/page.tsx`,
  `components/dashboard/user-create-form.tsx`.
- i18n keys `Services.assistance/companionship` → thêm `Services.virtual/physical` trong cả 3 locale.
