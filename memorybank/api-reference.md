# Memory Bank - API Reference

## Tổng quan

Tài liệu này cung cấp reference đầy đủ cho tất cả API endpoints trong hệ thống PR1AS.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `{PRODUCTION_URL}/api`

## Authentication

Hầu hết các endpoints yêu cầu authentication qua JWT token.

### Headers
```
Authorization: Bearer {access_token}
```

### Token Refresh
Khi access token hết hạn (401), sử dụng refresh token để lấy token mới:
```
POST /api/auth/refresh
```

## Response Format

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

## Authentication APIs

### POST `/api/auth/register`
Đăng ký tài khoản mới.

**Request Body**:
```typescript
{
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}
```

**Response**: User object với tokens

**Auth**: Not required

### POST `/api/auth/login`
Đăng nhập.

**Request Body**:
```typescript
{
  email: string;
  password: string;
}
```

**Response**: User object với access token và refresh token

**Auth**: Not required

### POST `/api/auth/logout`
Đăng xuất.

**Response**: Success message

**Auth**: Required

### POST `/api/auth/refresh`
Refresh access token.

**Request Body**:
```typescript
{
  refresh_token: string;
}
```

**Response**: New access token và refresh token

**Auth**: Not required (uses refresh token)

### GET `/api/auth/me`
Lấy thông tin user hiện tại.

**Response**: User object

**Auth**: Required

## User APIs

### GET `/api/users`
Lấy danh sách users với pagination.

**Query Params**:
- `page`: number (default: 1)
- `limit`: number (default: 10)
- `role`: UserRole (optional)
- `status`: UserStatus (optional)

**Response**:
```typescript
{
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Auth**: Required (Admin only)

### GET `/api/users/:id`
Lấy chi tiết user.

**Response**: User object

**Auth**: Required

### PUT `/api/users/:id`
Cập nhật user.

**Request Body**:
```typescript
{
  full_name?: string;
  phone?: string;
  avatar?: string;
  // ... other fields
}
```

**Response**: Updated user object

**Auth**: Required (Self or Admin)

### DELETE `/api/users/:id`
Xóa user.

**Response**: Success message

**Auth**: Required (Admin only)

## Service APIs

### GET `/api/services`
Lấy danh sách services.

**Query Params**:
- `page`: number (default: 1)
- `limit`: number (default: 10)
- `category`: string (optional)

**Response**:
```typescript
{
  services: Service[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Auth**: Not required (public)

### GET `/api/services/:id`
Lấy chi tiết service.

**Response**: Service object

**Auth**: Not required (public)

### POST `/api/services`
Tạo service mới.

**Request Body**:
```typescript
{
  name: string;
  description: string;
  category: string;
  // ... other fields
}
```

**Response**: Created service object

**Auth**: Required (Worker or Admin)

### PUT `/api/services/:id`
Cập nhật service.

**Request Body**: Service fields

**Response**: Updated service object

**Auth**: Required (Owner or Admin)

### DELETE `/api/services/:id`
Xóa service.

**Response**: Success message

**Auth**: Required (Owner or Admin)

## Worker Service APIs

### GET `/api/worker/services`
Lấy services của worker hiện tại.

**Query Params**:
- `page`: number (default: 1)
- `limit`: number (default: 10)

**Response**:
```typescript
{
  services: WorkerService[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Auth**: Required (Worker)

### POST `/api/worker/services`
Tạo worker service.

**Request Body**:
```typescript
{
  service_id: string;
  pricing_tiers: PricingTier[];
}
```

**Response**: Created worker service object

**Auth**: Required (Worker)

### PUT `/api/worker/services/:id`
Cập nhật worker service.

**Request Body**: Worker service fields

**Response**: Updated worker service object

**Auth**: Required (Worker, Owner)

### DELETE `/api/worker/services/:id`
Xóa worker service.

**Response**: Success message

**Auth**: Required (Worker, Owner)

## Wallet APIs

### POST `/api/wallet/deposit`
Tạo deposit transaction và get payment URL.

**Request Body**:
```typescript
{
  amount: number; // Min: 100, Max: 50000000
}
```

**Response**:
```typescript
{
  payment_url: string;
  transaction_id: string;
}
```

**Auth**: Required

**CSRF**: Required

### GET `/api/wallet/deposit/callback`
Verify payment callback từ VNPay.

**Query Params**: VNPay callback params
- `vnp_TxnRef`: Transaction ID
- `vnp_ResponseCode`: Response code
- `vnp_Amount`: Amount
- `vnp_SecureHash`: Secure hash
- ... other VNPay params

**Response**: Success/Error message

**Auth**: Required

### GET `/api/wallet/balance`
Lấy số dư hiện tại.

**Response**:
```typescript
{
  balance: number;
  user_id: string;
}
```

**Auth**: Required

### GET `/api/wallet/transactions`
Lấy lịch sử giao dịch.

**Query Params**:
- `type`: TransactionType (deposit, withdraw, payment, refund)
- `status`: TransactionStatus (pending, success, failed, cancelled)
- `page`: number (default: 1)
- `limit`: number (default: 10)

**Response**:
```typescript
{
  transactions: WalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Auth**: Required

## Chat APIs

### POST `/api/chat/messages`
Gửi message mới.

**Request Body**:
```typescript
{
  receiver_id: string;
  content: string;
  type: MessageType; // text, image, video, audio, file
  conversation_id?: string;
  reply_to_id?: string;
}
```

**Response**: Message object

**Auth**: Required

**Socket**: Emits `message:new` event to receiver

### GET `/api/chat/messages`
Lấy messages với pagination.

**Query Params**:
- `conversation_id`: string (optional)
- `receiver_id`: string (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response**:
```typescript
{
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Auth**: Required

### GET `/api/chat/conversations`
Lấy danh sách conversations.

**Query Params**:
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response**:
```typescript
{
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Auth**: Required

### GET `/api/chat/conversations/:id`
Lấy conversation details.

**Response**:
```typescript
{
  conversation: Conversation;
}
```

**Auth**: Required

### PATCH `/api/chat/messages/read`
Đánh dấu messages đã đọc.

**Request Body**:
```typescript
{
  message_ids?: string[];
  conversation_id?: string;
}
```

**Response**: Success message

**Auth**: Required

**Socket**: Emits `message:read` event

### GET `/api/chat/messages/unread`
Lấy số lượng unread messages.

**Query Params**:
- `conversation_id`: string (optional)

**Response**:
```typescript
{
  unread_count: number;
}
```

**Auth**: Required

### DELETE `/api/chat/messages/:id`
Xóa message.

**Response**: Success message

**Auth**: Required

## Error Codes

### Authentication Errors
- `AUTH_INVALID_CREDENTIALS`: Invalid email or password
- `AUTH_TOKEN_EXPIRED`: Access token expired
- `AUTH_TOKEN_INVALID`: Invalid token
- `AUTH_UNAUTHORIZED`: Unauthorized access
- `AUTH_FORBIDDEN`: Forbidden (insufficient permissions)

### Validation Errors
- `VALIDATION_ERROR`: Validation failed
- `VALIDATION_REQUIRED`: Required field missing
- `VALIDATION_INVALID_FORMAT`: Invalid format
- `VALIDATION_OUT_OF_RANGE`: Value out of range

### Wallet Errors
- `WALLET_NOT_FOUND`: Wallet not found
- `DEPOSIT_AMOUNT_TOO_LOW`: Deposit amount too low
- `DEPOSIT_AMOUNT_TOO_HIGH`: Deposit amount too high
- `PAYMENT_VERIFICATION_FAILED`: Payment verification failed
- `TRANSACTION_NOT_FOUND`: Transaction not found
- `TRANSACTION_FAILED`: Transaction failed

### Chat Errors
- `CONVERSATION_NOT_FOUND`: Conversation not found
- `MESSAGE_NOT_FOUND`: Message not found
- `INVALID_MESSAGE_TYPE`: Invalid message type
- `MESSAGE_TOO_LONG`: Message content too long

### General Errors
- `NOT_FOUND`: Resource not found
- `INTERNAL_SERVER_ERROR`: Internal server error
- `BAD_REQUEST`: Bad request
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded

## Rate Limiting

Một số endpoints có rate limiting để prevent abuse:
- Default: 100 requests per 15 minutes
- Authentication endpoints: Stricter limits
- Payment endpoints: Very strict limits

## Pagination

Hầu hết list endpoints hỗ trợ pagination:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10-20)
- Response includes `pagination` object với `total` và `totalPages`

## Filtering & Sorting

Một số endpoints hỗ trợ filtering và sorting:
- Filtering: Query params như `status`, `type`, `role`
- Sorting: `sort` và `order` query params (nếu supported)

## WebSocket Events

### Socket.IO Connection
- Connect: `socket.io-client` connects to server
- Authentication: Token được gửi trong connection handshake

### Events
- `message:new`: New message received
- `message:read`: Message marked as read
- `conversation:update`: Conversation updated
- `typing:start`: User started typing (future)
- `typing:stop`: User stopped typing (future)

## Testing

### Postman Collection
- Import Postman collection từ `docs/postman/` (nếu có)
- Set environment variables cho base URL và tokens

### cURL Examples
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get balance
curl -X GET http://localhost:3000/api/wallet/balance \
  -H "Authorization: Bearer {token}"

# Send message
curl -X POST http://localhost:3000/api/chat/messages \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"receiver_id":"user_id","content":"Hello","type":"text"}'
```

## Versioning

API hiện tại không có versioning. Khi cần breaking changes, sẽ implement versioning:
- `/api/v1/...`
- `/api/v2/...`

## Documentation Updates

Khi thêm/sửa API endpoints:
1. Update file này (`memorybank/api-reference.md`)
2. Update module-specific docs (`memorybank/wallet.md`, `memorybank/chat.md`, etc.)
3. Update Postman collection (nếu có)
4. Update OpenAPI/Swagger spec (nếu có)

