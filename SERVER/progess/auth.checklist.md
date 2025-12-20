# Checklist: Hệ thống Xác thực & Phân quyền

> Dựa trên tài liệu: `docs/auth.md`

---

## 1. Cấu trúc Database

- [x] Tạo schema/model User với các trường:
  - [x] `id` (ObjectId, primary key - Mongoose auto)
  - [x] `email` (unique, lowercase, trimmed)
  - [x] `password_hash` (bcrypt hash)
  - [x] `full_name` (optional)
  - [x] `phone` (optional)
  - [x] `roles` (array: `["client"]`, `["client", "worker"]`, `["admin"]`)
  - [x] `status` (enum: `active`, `banned`)
  - [x] `verify_email` (boolean, default: `false`)
  - [x] `created_at` (timestamp)
  - [x] `last_login` (timestamp, nullable)

---

## 2. Authentication (Xác thực)

### 2.1. JWT Configuration

- [x] Cấu hình JWT secret key trong environment variables
- [x] Cấu hình thời gian hết hạn access token (15 phút - 24 giờ)
- [x] Tạo utility function `generateToken(user)` với các claims:
  - [x] `sub`: userId
  - [x] `roles`: mảng role
  - [x] `status`: trạng thái tài khoản
  - [x] `iat`: thời điểm tạo
  - [x] `exp`: thời điểm hết hạn
- [x] Tạo utility function `verifyToken(token)`

### 2.2. Refresh Token (Optional)

- [ ] Tạo cơ chế refresh token
- [ ] Endpoint lấy access token mới từ refresh token

---

## 3. Authorization (Phân quyền)

### 3.1. Middleware

- [x] Tạo middleware `authenticate` - verify JWT token
- [x] Tạo middleware `authorize(roles[])` - kiểm tra role
- [x] Tạo middleware kiểm tra `status !== "banned"` (trả 403 nếu banned)

### 3.2. Route Guards

- [x] Guard cho Admin routes (`roles` chứa `"admin"`)
- [x] Guard cho Worker routes (`roles` chứa `"worker"`)
- [x] Guard cho Client routes (`roles` chứa `"client"`)

---

## 4. API Endpoints

### 4.1. POST /api/auth/register

- [x] Validate input:
  - [x] `email`: required, unique, normalize lowercase, trim
  - [x] `password`: required, tối thiểu 8 ký tự
  - [x] `full_name`: optional
  - [x] `phone`: optional
- [x] Kiểm tra email đã tồn tại
- [x] Hash password bằng bcrypt
- [x] Tạo user mới với `roles: ["client"]`, `status: "active"`
- [x] Generate JWT token
- [x] Response format:
  - [x] Success: 201 Created với `{ success, data: { user, token } }`
  - [x] Error email tồn tại: 409 Conflict với code `EMAIL_EXISTS`
  - [x] Error validation: 400 Bad Request với code `VALIDATION_ERROR`

### 4.2. POST /api/auth/login

- [x] Validate input: email, password
- [x] Tìm user theo email
- [x] So sánh password với hash (bcrypt compare)
- [x] Kiểm tra status không bị banned
- [x] Update `last_login`
- [x] Generate và trả về JWT token

### 4.3. GET /api/auth/me

- [x] Yêu cầu authenticate
- [x] Trả về thông tin user hiện tại

### 4.4. POST /api/auth/logout

- [x] Clear cookie token

---

## 5. Validation & Error Handling

- [x] Tạo validation schemas (Zod)
- [x] Chuẩn hóa error response format:
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "Mô tả lỗi",
      "details": []
    }
  }
  ```
- [x] Định nghĩa error codes: `EMAIL_EXISTS`, `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `FORBIDDEN`, `UNAUTHORIZED`

---

## 6. Security

- [x] Không lưu plaintext password
- [x] Sử dụng bcrypt với salt rounds phù hợp (10)
- [x] Bảo vệ JWT secret key (env variable)
- [x] Rate limiting cho endpoints auth (chống brute force)
- [x] Sanitize input để tránh injection (Zod + Mongoose)

---

## 7. Testing

- [ ] Unit tests cho JWT utilities
- [ ] Unit tests cho password hashing
- [ ] Integration tests cho register endpoint
- [ ] Integration tests cho login endpoint
- [ ] Tests cho middleware authorization
- [ ] Tests cho các edge cases (email trùng, password yếu, banned user)

---

## Tiến độ tổng quan

| Module            | Trạng thái    |
| ----------------- | ------------- |
| Database Schema   | ✅ Hoàn thành |
| JWT Utilities     | ✅ Hoàn thành |
| Auth Middleware   | ✅ Hoàn thành |
| Register Endpoint | ✅ Hoàn thành |
| Login Endpoint    | ✅ Hoàn thành |
| Error Handling    | ✅ Hoàn thành |
| Validation        | ✅ Hoàn thành |
| Testing           | ⬜ Chưa       |

---

**Ghi chú cập nhật:**

- Ngày tạo: 18/12/2025
- Cập nhật lần cuối: 18/12/2025
- Sử dụng Mongoose thay vì native MongoDB driver
- Cấu trúc: Route → Controller → Service → Repository
