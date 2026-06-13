# Admin User Management — Tạo user (worker/client) thủ công

> Tài liệu thiết kế / kế hoạch implement. Viết trước khi code.

## 1. Mục tiêu

Cho phép **admin** tạo user trực tiếp từ trang quản trị (`/dashboard/users`) để khởi tạo
dữ liệu thật cho dự án (local & production), giúp web trông như đã có người dùng/worker thật
và sẵn sàng vận hành. User do admin tạo **bỏ qua toàn bộ bước xác thực email**.

Đặc điểm chốt với người dùng:
- Định danh đăng nhập = **email** (hệ thống không có field `username`). `full_name` là tên hiển thị.
- Worker tạo ra phải **hiển thị & bookable ngay** → cần đủ `worker_profile` + ≥1 `WorkerService` (pricing) + `work_locations`.
- Avatar/gallery: **upload file** (tái dùng `uploadImage`) **hoặc dán URL** (URL phải khớp `MEDIA_ALLOWED_HOSTS`).
- UX tạo nhiều user: **workspace nhiều "trang/tab"** — mỗi user là 1 trang form đầy đủ; nút "Thêm user"
  mở trang mới; chuyển qua lại giữa các trang để chỉnh sửa từng user trước khi lưu. (Không làm import CSV ở giai đoạn này.)

## 2. Hiện trạng codebase (đã khảo sát)

- **Auth/role**: `SERVER/src/middleware/auth.ts` → `adminOnly = authorize(UserRole.ADMIN)`. Roles: `client | worker | admin`.
- **User model** (`SERVER/src/models/auth/user.model.ts`): `email`(unique), `password_hash`(select:false, bcrypt 10 rounds),
  `full_name`, `phone`, `avatar`, `roles[]`, `last_active_role`, `status`(enum), `verify_email`,
  `worker_profile`(subdoc), `client_profile`, `meta_data`(reputation_score=100, pricing_plan_code=standard, onboarding_done).
  Lưu ý: `coords` có trong type `IUser` nhưng **không có trong schema** → không persist (bỏ qua).
- **Để worker hiển thị trong listing** (`SERVER/src/repositories/worker/worker-service.repository.ts` aggregate):
  worker phải `status=ACTIVE`, `worker_profile != null`, và có ≥1 `WorkerService` active trỏ tới `Service` active.
- **Services đã seed sẵn** (`SERVER/src/scripts/seed-services.ts`, 7 code): VIRTUAL_ASSISTANT, DIRECT_SUPPORT,
  TRANSLATION, TOUR_GUIDE, PRESENCE, CONNECTION, FORMAL.
- **work_locations**: `{ province_code:number, ward_code?:number, label_snapshot?:string }`. Mã hành chính VN lấy từ
  `provinces.open-api.vn/api/v2` (client đã có `pr1as-client/lib/vn-provinces/work-locations-api.ts`).
  Backend chỉ lưu code + label snapshot, **không phụ thuộc** collection `Location`.
- **Wallet** (unique theo user) + **WorkerPointWallet** (cho worker) là 2 collection riêng, tạo kèm khi tạo user/worker.
- **Endpoint admin user hiện có**: `GET /user` (list + filter role/status/search/date, phân trang) và
  `PATCH /user/:id/status`. Trang `pr1as-client/app/dashboard/users/page.tsx` đã có bảng quản lý + đổi trạng thái.
- **Validation tham chiếu**: `SERVER/src/validations/user/*` (`updateWorkerProfileSchema`, `avatarUrlSchema`) và
  `validations/worker/worker-service.validation.ts` (`pricingSchema`: unit∈HOURLY/DAILY/MONTHLY, duration int≥1, price>0, currency→VND).

## 3. Backend — thay đổi

### 3.1 Endpoint
`POST /user` (đặt trong `routes/user/user.routes.ts`, nhóm `authenticate, adminOnly`, kèm `csrfProtection`).
Controller `userController.createUser` → `userService.createUserByAdmin(input)`.

### 3.2 Validation — `validations/user/admin-create-user.validation.ts` (Zod)
```
adminCreateUserSchema = {
  email:      z.string().email(),
  password:   z.string().min(8),                  // admin set, có thể auto-gen ở FE
  full_name:  z.string().trim().min(1).max(100),
  phone:      z.string().trim().optional().nullable(),
  avatar:     z.union([avatarUrlSchema, z.null()]).optional(),
  roles:      z.array(z.enum([client, worker])).min(1).default([client]),
  status:     z.nativeEnum(UserStatus).default(ACTIVE),
  worker_profile?: <reuse shape của updateWorkerProfileSchema.worker_profile, bỏ coords>,
  worker_services?: z.array({ service_code: string(uppercase), pricing: [pricingSchema] }).min(1),
}
.superRefine: nếu roles chứa 'worker' ⇒ worker_profile & worker_services bắt buộc.
```

### 3.3 Service — `userService.createUserByAdmin`
1. Check trùng email → 409 nếu tồn tại.
2. `hashPassword(password)`.
3. `userRepository.create({ email, password_hash, full_name, phone, avatar, roles,
   last_active_role: worker?WORKER:CLIENT, status: ACTIVE, verify_email: true,
   worker_profile: roles⊇worker ? profileFields : null,
   meta_data.onboarding_done: true })` — **không** sinh email_verification_token.
4. Tạo `Wallet` (balance 0). Nếu worker: tạo `WorkerPointWallet` + upsert `WorkerService` qua
   `workerServiceService`/repo (map service_code → service_id, validate service active).
5. Audit log `event: "ADMIN_CREATE_USER"`.
6. Trả `toPublicUser(user)`.
> Cân nhắc transaction/cleanup nếu một bước phụ (wallet/service) lỗi sau khi user đã tạo.

## 4. Frontend — `pr1as-client`

### 4.1 Workspace tạo user (multi-draft)
- Route mới: `app/dashboard/users/create/page.tsx` (link từ nút "Tạo người dùng" ở trang list).
- State: danh sách **draft** giữ client-side (Zustand hoặc useState + persist localStorage để không mất khi refresh).
  Mỗi draft: `{ id, label, status: 'draft'|'saving'|'saved'|'error', error?, form }`.
- Layout: thanh tab/sidebar liệt kê các draft (email/tên + badge trạng thái) + nút **"+ Thêm user"** tạo draft mới;
  panel chính render form của draft đang chọn. Chuyển tab không mất dữ liệu các tab khác.
- Hành động: **Lưu** (POST /user cho draft hiện tại) · **Lưu tất cả** (tuần tự, báo cáo từng draft) ·
  **Nhân bản** draft · **Xóa** draft. Draft `saved` hiển thị tick xanh.

### 4.2 Form mỗi draft
- **Tài khoản**: email (+ nút auto-gen `worker<n>@...`), password (+ nút auto-gen + copy), full_name, phone,
  avatar (uploadImage / dán URL), roles (client/worker), status.
- **Worker** (hiện khi chọn role worker): title, gender, date_of_birth, experience, height/weight, star_sign,
  lifestyle, hobbies[], quote, introduction, gallery_urls[] (upload/URL), work_locations (dùng lại `vn-provinces`),
  **services + pricing** (chọn service_code từ 7 service, thêm dòng pricing unit/duration/price).
- Tiện ích "Điền mẫu" prefill dữ liệu realistic (tên VN, bio, pricing hợp lý) để tạo nhanh.

### 4.3 Service/hook client
- `services/user.service.ts`: thêm `createUser(payload)` → `POST /user`.
- Hook `lib/hooks/use-users.ts`: thêm `useCreateUser` (mutation, invalidate list).
- Mở rộng bảng list: badge `verify_email`, plan, có/không worker_profile (tùy chọn).

## 5. An toàn & lưu ý
- Chỉ `adminOnly` + CSRF. Password tối thiểu 8 ký tự; cân nhắc policy mạnh hơn.
- Email do admin tạo nên hợp lệ & không gửi mail xác thực (verify_email=true ngay).
- Avatar/gallery URL phải nằm trong `MEDIA_ALLOWED_HOSTS`; nếu dùng auto-avatar (pravatar/dicebear) phải thêm host.
- Không đổi schema để thêm `username` (giữ email làm credential) — tránh ảnh hưởng auth/migration.

## 6. Checklist triển khai
- [x] BE: `admin-create-user.validation.ts`
- [x] BE: `userService.createUserByAdmin` (+ wallet/point-wallet/worker-service)
- [x] BE: `userController.createUser` + route `POST /user` (+ `userRepository.createByAdmin`)
- [x] FE: `services/user.service.ts` `createUser` + `useCreateUser`
- [x] FE: route `app/dashboard/users/create/page.tsx` (workspace multi-draft)
- [x] FE: form component `components/dashboard/user-create-form.tsx` (account + worker + services/pricing + work_locations + upload)
- [x] FE: nút "Tạo người dùng" ở `app/dashboard/users/page.tsx`
- [ ] Kiểm thử: tạo worker → hiển thị trong listing & bookable; login bằng email không cần verify.
