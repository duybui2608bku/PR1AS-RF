# Admin Dashboard Feature Documentation

## Tổng Quan
Admin panel: quản lý users, xem thống kê wallet/transactions.

## Cấu Trúc File
```
app/admin/dashboard/
├── page.tsx                          # Dashboard overview
├── page.module.scss
├── layout.tsx                        # Admin layout (sidebar)
├── layout.module.scss
├── user/
│   ├── page.tsx                      # Quản lý users (list + status update)
│   ├── page.module.scss
│   └── constants/
│       └── user.constants.ts         # UserStatus, UserRole enums, tag colors
└── wallet/
    ├── page.tsx                      # Quản lý transactions
    └── page.module.scss
```

## API Integration
### User Management
| Hook | API Endpoint | Query Key | Mô tả |
|------|-------------|-----------|-------|
| `useQuery` | `userApi.getUsers()` | `["admin-users", filters]` | Danh sách users |
| `useStandardizedMutation` | `userApi.updateUserStatus()` | - | Ban/unban user |

### Wallet Management
| Hook | API Endpoint | Query Key | Mô tả |
|------|-------------|-----------|-------|
| `useQuery` | `walletApi.getAdminTransactions()` | `["admin-transactions", query]` | Giao dịch hệ thống |
| `useQuery` | `walletApi.getAdminStats()` | `["admin-wallet-stats"]` | Thống kê tổng |

## State Management
- **Filters (User)**: `filters: GetUsersQuery` (search, role, status, page, limit)
- **Modal (User)**: `statusModalVisible`, `selectedUser`, `newStatus`

## Debug Guide
1. **User list trống**: Kiểm tra API role authorization (admin only)
2. **Status update lỗi**: Kiểm tra `updateStatusMutation`, xem `UserStatus` enum
3. **Search không hoạt động**: Kiểm tra `handleSearch()` — search text phải trim trước khi gửi
