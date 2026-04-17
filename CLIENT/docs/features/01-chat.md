# Chat Feature Documentation

## Tổng Quan
1-1 real-time chat và group chat (khiếu nại booking) với socket.io.

## Cấu Trúc File
```
app/chat/
├── page.tsx                      # Trang chat 1-1 chính (ChatContent)
├── chat.module.scss              # Styles cho toàn bộ chat UI
├── components/
│   ├── ConversationList.tsx       # Danh sách hội thoại bên trái
│   ├── MessageItem.tsx            # [NEW] Component hiển thị 1 tin nhắn (memo)
│   ├── ChatInput.tsx              # [NEW] Component nhập tin nhắn + attach + reply
│   └── SocketDebug.tsx            # Debug panel cho socket
└── group/
    └── components/
        ├── GroupChatView.tsx      # Group chat cho khiếu nại
        ├── ComplaintGroupList.tsx # Danh sách group khiếu nại
        └── BookingInfoPopover.tsx # Popover thông tin booking
```

## Component Hierarchy
```
ChatPage (AuthGuard)
└── ChatContent
    ├── ConversationList (danh sách hội thoại)
    ├── MessageItem[] (danh sách tin nhắn, memo-ized)
    └── ChatInput (nhập tin nhắn + attach + reply preview)
```

## API Integration
| Hook | API Endpoint | Query Key | Mô tả |
|------|-------------|-----------|-------|
| `useQuery` | `chatApi.getConversations()` | `["chat-conversations"]` | Danh sách hội thoại, refetch 30s |
| `useQuery` | `chatApi.getMessages()` | `["chat-messages", conversationId]` | Tin nhắn của hội thoại |
| `useQuery` | `chatApi.getMessages()` | `["chat-target-lookup", targetUserId]` | Tìm conversation cho target user |
| `useStandardizedMutation` | `chatApi.sendMessage()` | - | Gửi tin nhắn text |
| `useStandardizedMutation` | `chatApi.sendMessage()` | - | Gửi ảnh (sendImageMutation) |
| `useStandardizedMutation` | `chatApi.deleteMessage()` | - | Xóa tin nhắn |
| `useStandardizedMutation` | `chatApi.markAsRead()` | - | Đánh dấu đã đọc |

## Socket Events
- `onNewMessage` → invalidate messages + conversations
- `onUserTyping` → hiển thị typing indicator
- `onMessageDeleted` → invalidate messages
- `joinConversation` / `leaveConversation` → join/leave room khi chọn conversation

## State Management
- **Local state**: `selectedConversationId`, `messageContent`, `typingUsers`, `replyingTo`, `mobileMenuOpenId`
- **Hook**: `useMobile()` — phát hiện mobile viewport
- **Ref**: `replyingToRef` (sync ref cho socket callback), `messagesEndRef` (auto scroll)

## Debug Guide
1. **Tin nhắn không hiển thị**: Kiểm tra `selectedConversationId` đúng chưa, check query key `["chat-messages", id]`
2. **Typing indicator không hoạt động**: Kiểm tra `useChatSocket()` → `sendTyping()` có gọi không
3. **Ảnh không gửi được**: Kiểm tra `uploadImage()` → `sendImageMutation` flow, xem error trong network tab
4. **Không tự scroll xuống**: Kiểm tra `messagesEndRef.current?.scrollIntoView()` trong useEffect
