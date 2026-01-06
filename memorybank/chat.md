# Memory Bank - Chat/Messaging System

## Tổng quan

Hệ thống Chat cho phép users gửi và nhận messages real-time qua Socket.IO. Hệ thống hỗ trợ conversations, message history, read receipts, và unread count tracking.

## Kiến trúc

### Backend Components

#### Models (`SERVER/src/models/chat/`)
- **Message Model**: Lưu trữ messages
  - `sender_id`: String (required, indexed)
  - `receiver_id`: String (required, indexed)
  - `conversation_id`: String (indexed)
  - `content`: String (required)
  - `type`: MessageType (text, image, video, audio, file)
  - `is_read`: Boolean (default: false)
  - `read_at`: Date (optional)
  - `reply_to_id`: String (optional, reference to another message)
  - `created_at`: Date
  - `updated_at`: Date

- **Conversation Model**: Lưu trữ conversations (có thể được tính toán từ messages)
  - Conversation được xác định bởi `sender_id` và `receiver_id`
  - Last message được track để hiển thị preview
  - Unread count được tính toán

#### Services (`SERVER/src/services/chat/`)

**chat.service.ts**:
- `sendMessage()`: Gửi message và emit Socket.IO event
- `getMessages()`: Lấy messages với pagination và filters
- `getConversations()`: Lấy danh sách conversations với last message và unread count
- `getConversation()`: Lấy conversation details
- `markAsRead()`: Đánh dấu messages là đã đọc
- `getUnreadCount()`: Lấy số lượng unread messages
- `deleteMessage()`: Xóa message (soft delete hoặc hard delete)

#### Controllers (`SERVER/src/controllers/chat/`)
- `sendMessage`: POST `/api/chat/messages` - Gửi message
- `getMessages`: GET `/api/chat/messages` - Lấy messages
- `getConversations`: GET `/api/chat/conversations` - Lấy conversations
- `getConversation`: GET `/api/chat/conversations/:id` - Lấy conversation details
- `markAsRead`: PATCH `/api/chat/messages/read` - Đánh dấu đã đọc
- `getUnreadCount`: GET `/api/chat/messages/unread` - Lấy unread count
- `deleteMessage`: DELETE `/api/chat/messages/:id` - Xóa message

### Frontend Components

#### Socket Integration (`CLIENT/lib/socket/`)

**chat.ts**:
- Socket.IO client configuration
- Event handlers:
  - `message:new`: Nhận message mới
  - `message:read`: Message được đánh dấu đã đọc
  - `conversation:update`: Conversation được update

**use-socket.ts** Hook:
- Connect/disconnect Socket.IO
- Subscribe/unsubscribe to events
- Emit events

#### API Client (`CLIENT/lib/api/chat.api.ts`)
- `sendMessage()`: Gửi message
- `getMessages()`: Lấy messages với pagination
- `getConversations()`: Lấy conversations
- `getConversation()`: Lấy conversation details
- `markAsRead()`: Đánh dấu đã đọc
- `getUnreadCount()`: Lấy unread count
- `deleteMessage()`: Xóa message

#### Pages (`CLIENT/app/chat/`)
- `/chat`: Chat page với conversation list và message view

#### Components (`CLIENT/app/chat/components/`)
- Chat interface components
- Message components
- Conversation list components

## Socket.IO Events

### Client → Server Events

- `message:send`: Gửi message mới
  ```typescript
  {
    receiver_id: string;
    content: string;
    type: MessageType;
    conversation_id?: string;
    reply_to_id?: string;
  }
  ```

- `message:read`: Đánh dấu messages đã đọc
  ```typescript
  {
    message_ids?: string[];
    conversation_id?: string;
  }
  ```

### Server → Client Events

- `message:new`: Nhận message mới
  ```typescript
  {
    _id: string;
    sender_id: string;
    receiver_id: string;
    conversation_id: string;
    content: string;
    type: MessageType;
    is_read: boolean;
    reply_to_id?: string;
    created_at: string;
    updated_at: string;
  }
  ```

- `message:read`: Message được đánh dấu đã đọc
  ```typescript
  {
    message_ids: string[];
    conversation_id?: string;
  }
  ```

- `conversation:update`: Conversation được update
  ```typescript
  {
    conversation_id: string;
    last_message?: Message;
    unread_count?: number;
  }
  ```

## Message Types

- **text**: Text message
- **image**: Image message (URL hoặc base64)
- **video**: Video message
- **audio**: Audio message
- **file**: File attachment

## Conversation Management

### Conversation Identification
Conversation được xác định bởi cặp `sender_id` và `receiver_id`. Mỗi cặp user chỉ có một conversation.

### Last Message
Last message của conversation được track để hiển thị preview trong conversation list.

### Unread Count
Unread count được tính toán từ số lượng messages có `is_read = false` và `receiver_id = current_user_id`.

## API Endpoints

### POST `/api/chat/messages`
Gửi message mới.

**Request**:
```typescript
{
  receiver_id: string;
  content: string;
  type: MessageType;
  conversation_id?: string;
  reply_to_id?: string;
}
```

**Response**:
```typescript
{
  _id: string;
  sender_id: string;
  receiver_id: string;
  conversation_id: string;
  content: string;
  type: MessageType;
  is_read: boolean;
  reply_to_id?: string;
  created_at: string;
  updated_at: string;
}
```

**Auth**: Required (authenticate middleware)

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

**Auth**: Required (authenticate middleware)

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

**Auth**: Required (authenticate middleware)

### GET `/api/chat/conversations/:id`
Lấy conversation details.

**Response**:
```typescript
{
  conversation: Conversation;
}
```

**Auth**: Required (authenticate middleware)

### PATCH `/api/chat/messages/read`
Đánh dấu messages đã đọc.

**Request**:
```typescript
{
  message_ids?: string[];
  conversation_id?: string;
}
```

**Response**: Success message

**Auth**: Required (authenticate middleware)

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

**Auth**: Required (authenticate middleware)

### DELETE `/api/chat/messages/:id`
Xóa message.

**Response**: Success message

**Auth**: Required (authenticate middleware)

## Real-time Features

### Message Delivery
- Messages được gửi qua Socket.IO để real-time delivery
- Nếu Socket.IO không available, fallback về HTTP API
- Messages được persist trong database

### Read Receipts
- `is_read` flag được update khi user đọc message
- `read_at` timestamp được lưu
- Socket.IO event được emit để notify sender

### Typing Indicators
- Có thể implement typing indicators với Socket.IO events
- `typing:start` và `typing:stop` events

### Online Status
- Track user online/offline status
- Hiển thị online status trong conversation list

## Pagination

Messages và conversations sử dụng cursor-based hoặc offset-based pagination:
- Default page: 1
- Default limit: 20 messages, 20 conversations
- Total và totalPages được return trong response

## Security Considerations

1. **Authorization**: Verify user có quyền access conversation
2. **Message Ownership**: Verify sender/receiver relationship
3. **Content Validation**: Validate message content và type
4. **Rate Limiting**: Prevent spam messages
5. **XSS Prevention**: Sanitize message content

## Error Handling

### Common Errors
- `CONVERSATION_NOT_FOUND`: Conversation không tồn tại
- `MESSAGE_NOT_FOUND`: Message không tồn tại
- `UNAUTHORIZED`: User không có quyền access
- `INVALID_MESSAGE_TYPE`: Message type không hợp lệ
- `MESSAGE_TOO_LONG`: Message content quá dài

## Future Enhancements

- [ ] File upload cho images/videos/files
- [ ] Message reactions (emoji)
- [ ] Message editing
- [ ] Message forwarding
- [ ] Group conversations
- [ ] Voice/video calls
- [ ] Message search
- [ ] Message encryption
- [ ] Message scheduling
- [ ] Read receipts với timestamps
- [ ] Typing indicators
- [ ] Online/offline status
- [ ] Push notifications
- [ ] Message pinning
- [ ] Message starring

