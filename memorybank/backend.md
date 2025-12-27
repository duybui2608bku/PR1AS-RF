# Memory Bank - Backend (SERVER)

## Tổng quan dự án

PR1AS Server là một ứng dụng backend được xây dựng bằng Node.js + Express + TypeScript với MongoDB làm database. Server hỗ trợ authentication, authorization, real-time communication qua Socket.IO và các tính năng bảo mật.

## Kiến trúc

### Cấu trúc thư mục

```
SERVER/
├── src/
│   ├── config/          # Cấu hình (database, socket, environment)
│   ├── constants/       # Hằng số (HTTP status, messages)
│   ├── controllers/     # Request handlers (xử lý HTTP requests)
│   ├── middleware/      # Express middleware (auth, errorHandler, pagination)
│   ├── models/          # Data models (Mongoose schemas)
│   ├── repositories/    # Data access layer (tương tác với database)
│   ├── routes/          # API routes (định nghĩa endpoints)
│   ├── services/       # Business logic layer
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions (logger, jwt, bcrypt, validation, date, lodash)
│   ├── validations/     # Request validation schemas (Zod)
│   └── index.ts         # Entry point
├── docs/                # Tài liệu API và hướng dẫn
├── logs/                # Log files (Winston)
└── dist/                # Compiled JavaScript (TypeScript output)
```

## Công nghệ sử dụng

### Core Dependencies

- **express** (^4.18.2) - Web framework
- **typescript** (^5.3.2) - TypeScript compiler
- **dotenv** (^16.3.1) - Environment variables
- **mongoose** (^9.0.2) - MongoDB ODM
- **mongodb** (^6.3.0) - MongoDB driver

### Authentication & Security

- **jsonwebtoken** (^9.0.2) - JWT authentication
- **bcrypt** (^5.1.1) - Password hashing
- **helmet** (^7.1.0) - Security headers
- **cors** (^2.8.5) - Cross-Origin Resource Sharing
- **express-rate-limit** (^7.1.5) - Rate limiting
- **cookie-parser** (^1.4.6) - Cookie parsing

### Validation

- **zod** (^3.22.4) - Schema validation (type-safe)
- **express-validator** (^7.0.1) - Express validation middleware
- **class-validator** (^0.14.0) - Decorator-based validation
- **class-transformer** (^0.5.1) - Object transformation

### Real-time & Utilities

- **socket.io** (^4.6.1) - Real-time bidirectional communication
- **dayjs** (^1.11.10) - Date manipulation
- **lodash** (^4.17.21) - Utility library
- **winston** (^3.11.0) - Logging
- **morgan** (^1.10.0) - HTTP request logger
- **compression** (^1.7.4) - Response compression

## Kiến trúc Layers

### 1. Routes Layer (`src/routes/`)

- Định nghĩa API endpoints
- Kết nối với controllers
- Áp dụng middleware (auth, validation)
- Ví dụ: `/api/auth`, `/api/users`, `/api/services`

### 2. Controllers Layer (`src/controllers/`)

- Xử lý HTTP requests/responses
- Gọi services để thực hiện business logic
- Trả về response thông qua `R.success()` hoặc `R.error()`
- Sử dụng `asyncHandler` để xử lý async errors

### 3. Services Layer (`src/services/`)

- Chứa business logic
- Tương tác với repositories
- Xử lý validation và transformation
- Không trực tiếp tương tác với HTTP layer

### 4. Repositories Layer (`src/repositories/`)

- Data access layer
- Tương tác trực tiếp với database (Mongoose)
- CRUD operations
- Query building

### 5. Models Layer (`src/models/`)

- Mongoose schemas
- Định nghĩa cấu trúc dữ liệu
- Validation rules
- Indexes và relationships

## Authentication & Authorization

### JWT Authentication

- **Access Token**: JWT với thời gian hết hạn ngắn (mặc định: 15m)
- **Refresh Token**: JWT với thời gian hết hạn dài (mặc định: 7d)
- Token được lưu trong cookies hoặc Authorization header (Bearer token)

### Middleware

- `authenticate`: Xác thực JWT token, kiểm tra user status
- `authorize(...roles)`: Kiểm tra quyền dựa trên roles
- Shortcuts: `adminOnly`, `workerOnly`, `clientOnly`

### User Roles

- `ADMIN`: Quản trị viên
- `WORKER`: Người lao động
- `CLIENT`: Khách hàng

### User Status

- `ACTIVE`: Hoạt động
- `BANNED`: Bị cấm
- `INACTIVE`: Không hoạt động

### User Model Schema

```typescript
{
  email: String (unique, required, indexed, lowercase)
  password_hash: String (required)
  avatar: String (optional)
  full_name: String (optional)
  phone: String (optional)
  roles: Array<UserRole> (default: [CLIENT])
  last_active_role: UserRole (default: CLIENT)
  status: UserStatus (default: ACTIVE)
  verify_email: Boolean (default: false)
  worker_profile: {
    date_of_birth: Date
    gender: MALE | FEMALE | OTHER
    height_cm: Number
    weight_kg: Number
    star_sign: String
    lifestyle: String
    hobbies: Array<String>
    quote: String
    introduction: String
    gallery_urls: Array<String>
  }
  client_profile: {
    company_name: String
    website: String
    total_spent: Number
  }
  coords: {
    latitude: Number
    longitude: Number
  }
  refresh_token_hash: String (hashed, not selected)
  created_at: Date
  last_login: Date
}
```

## API Response Format

Tất cả API responses sử dụng format chuẩn:

```typescript
{
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
    stack?: string; // Chỉ trong development
  };
}
```

### Response Helpers (`src/utils/response.ts`)

- `R.success(res, data, message)`: Success response
- `R.error(res, error, statusCode)`: Error response

## Error Handling

### AppError Class (`src/utils/AppError.ts`)

- Custom error class với status code và message
- Static methods: `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `internalServerError()`

### Error Handler Middleware (`src/middleware/errorHandler.ts`)

- Xử lý tất cả errors
- Logging errors với Winston
- Trả về formatted error response
- 404 handler cho routes không tồn tại

## Validation

### Request Validation

- Sử dụng Zod schemas trong `src/validations/`
- Validate trong routes trước khi vào controllers
- Trả về detailed validation errors nếu fail

### Example Validation Schema

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
```

## Database

### MongoDB Connection (`src/config/database.ts`)

- Kết nối MongoDB qua Mongoose
- Connection pooling
- Graceful shutdown handling

### Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `DB_NAME`: Database name (mặc định: "pr1as")

## Logging

### Winston Logger (`src/utils/logger.ts`)

- Log levels: error, warn, info, debug
- File logging: `logs/error.log`, `logs/combined.log`
- Console logging trong development
- Format: JSON trong production, readable trong development

### Morgan HTTP Logger

- Format: "dev" trong development, "combined" trong production
- Logs tất cả HTTP requests

## Socket.IO

### Configuration (`src/config/socket.ts`)

- Real-time bidirectional communication
- Ping timeout: 60 seconds (có thể config)
- CORS configuration

## Environment Variables

### Required Variables

```env
PORT=3000
NODE_ENV=development|production
MONGODB_URI=mongodb://localhost:27017
DB_NAME=pr1as
JWT_SECRET=your-secret-key
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
```

### Optional Variables

```env
CORS_METHODS=GET,POST,PUT,DELETE,PATCH
CORS_CREDENTIALS=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
MORGAN_FORMAT=dev
SOCKET_PING_TIMEOUT=60000
LOG_DIR=logs
ERROR_LOG_FILE=error.log
COMBINED_LOG_FILE=combined.log
```

## API Routes

### Base Path: `/api`

- `/api/auth` - Authentication endpoints

  - `POST /register` - User registration
  - `POST /login` - User login
  - `POST /logout` - User logout
  - `POST /refresh` - Refresh access token
  - `GET /me` - Get current user info

- `/api/users` - User management endpoints

  - `GET /` - List users (with pagination)
  - `GET /:id` - Get user by ID
  - `PUT /:id` - Update user
  - `DELETE /:id` - Delete user

- `/api/services` - Service endpoints

  - `GET /` - List services
  - `GET /:id` - Get service by ID
  - `POST /` - Create service (requires auth)
  - `PUT /:id` - Update service
  - `DELETE /:id` - Delete service

- `/api/worker/services` - Worker service management

  - Worker-specific service endpoints

- `/health` - Health check endpoint (không có prefix `/api`)

## Quy ước Coding

### Naming Conventions

- **Files**: kebab-case (ví dụ: `user.controller.ts`)
- **Classes**: PascalCase (ví dụ: `UserController`)
- **Functions/Variables**: camelCase (ví dụ: `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (ví dụ: `MAX_RETRY_COUNT`)

### File Structure

- Mỗi module có folder riêng trong mỗi layer
- Export qua `index.ts` trong mỗi folder
- Types được định nghĩa trong `src/types/`

### Error Handling

- Luôn sử dụng `asyncHandler` cho async route handlers
- Throw `AppError` thay vì throw Error thông thường
- Let error handler middleware xử lý errors

### Response Format

- Luôn sử dụng `R.success()` hoặc `R.error()` từ `src/utils/response.ts`
- Không trả về response trực tiếp từ controllers

## Scripts

```bash
npm run dev      # Development mode với hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Start production server
npm run lint     # Lint code
npm run lint:fix # Fix linting errors
npm run format   # Format code với Prettier
npm test         # Run tests
```

## Security Features

1. **Helmet**: Security headers
2. **CORS**: Cross-origin resource sharing configuration
3. **Rate Limiting**: Prevent abuse
4. **JWT Authentication**: Secure token-based auth
5. **Password Hashing**: bcrypt với salt rounds
6. **Input Validation**: Zod schemas
7. **Error Handling**: Không expose sensitive info trong production

## Development Guidelines

1. Luôn sử dụng TypeScript strict mode
2. Validate tất cả inputs với Zod
3. Sử dụng async/await thay vì callbacks
4. Log errors với Winston
5. Handle errors properly với AppError
6. Test API endpoints với proper error cases
7. Document API changes trong `docs/`
