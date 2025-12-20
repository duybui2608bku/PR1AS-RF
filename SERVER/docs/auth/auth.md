# Đặc tả Hệ thống Xác thực & Phân quyền

## 1. Khái niệm & Phân loại Người dùng

### 1.1. Các vai trò (Roles)

Hệ thống có 2 nhóm quyền chính:

**Admin**

- Quản trị viên hệ thống

- Có toàn quyền quản lý
  **User**

- Tài khoản người dùng thông thường
- Có thể có 1 hoặc nhiều sub-role:
  - **Client**: người thuê dịch vụ
  - **Worker**: người cung cấp dịch vụ
    > ✅ 1 account có thể đồng thời là Client và Worker (không cần tạo tài khoản mới)

**Cấu trúc lưu trữ role (khuyến nghị dạng mảng):**

```
roles: ["client"]                  // Mặc định khi đăng ký
roles: ["client", "worker"]        // Khi được duyệt làm worker
roles: ["admin"]                   // Tài khoản admin
```

---

## 2. Xác thực & Phân quyền (Authentication / Authorization)

### 2.1. Cơ chế xác thực

- Sử dụng **JWT (JSON Web Token)** cho authentication và authorization
- JWT được cấp khi đăng nhập thành công
- JWT chứa các claim tối thiểu:

| Claim    | Mô tả                                |
| -------- | ------------------------------------ |
| `sub`    | userId                               |
| `roles`  | Mảng role của user                   |
| `status` | Trạng thái tài khoản (active/banned) |
| `iat`    | Thời điểm tạo token                  |
| `exp`    | Thời điểm hết hạn                    |

### 2.2. Chuẩn token

- **Access token**: JWT (thời hạn theo cấu hình, ví dụ: 15 phút - 24 giờ)
- **Refresh token** (optional): Dùng để lấy access token mới khi hết hạn

### 2.3. Rule phân quyền

| Route type    | Yêu cầu                 |
| ------------- | ----------------------- |
| Admin routes  | `roles` chứa `"admin"`  |
| Worker routes | `roles` chứa `"worker"` |
| Client routes | `roles` chứa `"client"` |

> ⛔ Nếu `status = "banned"` → Chặn toàn bộ request (trả HTTP 403 Forbidden)

---

## 3. Đăng ký Tài khoản (Register)

### 3.1. Hình thức đăng ký

- Đăng ký bằng **email + password**
- Không yêu cầu xác minh email tại thời điểm đăng ký (verify sau)

### 3.2. Dữ liệu đầu vào

| Field       | Required | Validation                        |
| ----------- | -------- | --------------------------------- |
| `email`     | ✅       | Unique, normalize lowercase, trim |
| `password`  | ✅       | Tối thiểu 8 ký tự                 |
| `full_name` | ❌       | Optional                          |
| `phone`     | ❌       | Optional                          |

### 3.3. Xử lý backend

1. Kiểm tra email đã tồn tại chưa
2. Hash password bằng **bcrypt** (không lưu plaintext)
3. Tạo user mới với:

```json
{
  "email": "user@example.com",
  "password_hash": "$2b$10$...",
  "roles": ["client"],
  "status": "active",
  "verify_email": false,
  "created_at": "2025-01-01T00:00:00Z",
  "last_login": null
}
```

### 3.4. Response

**Success (201 Created):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "roles": ["client"],
      "status": "active",
      "verify_email": false,
      "created_at": "2025-01-01T00:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error - Email đã tồn tại (409 Conflict):**

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "Email đã được đăng ký"
  }
}
```

**Error - Validation (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      { "field": "password", "message": "Mật khẩu phải có ít nhất 8 ký tự" }
    ]
  }
}
```

---

## 4. Sơ đồ Flow Đăng ký

```
┌─────────┐         ┌─────────┐         ┌──────────┐
│ Client  │         │ Backend │         │ Database │
└────┬────┘         └────┬────┘         └────┬─────┘
     │                   │                   │
     │ POST /register    │                   │
     │ {email, password} │                   │
     │──────────────────>│                   │
     │                   │                   │
     │                   │ Check email exists│
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │                   │ Hash password     │
     │                   │ (bcrypt)          │
     │                   │                   │
     │                   │ Insert user       │
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │                   │ Generate JWT      │
     │                   │                   │
     │ {user, token}     │                   │
     │<──────────────────│                   │
     │                   │                   │
```
