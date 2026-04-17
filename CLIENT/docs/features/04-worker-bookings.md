# Worker Bookings Feature Documentation

## Tổng Quan
Quản lý booking phía worker: xem, chấp nhận, từ chối, hủy booking.

## Cấu Trúc File
```
app/worker/bookings/
├── page.tsx                              # Trang chính (filters + table/cards)
├── page.module.scss
├── constants/
│   └── booking.constants.ts              # Columns config, action types, cancellation reasons
└── components/
    ├── WorkerBookingCard.tsx              # Card booking cho mobile view
    ├── WorkerBookingCard.module.scss
    ├── WorkerBookingActions.tsx           # Action buttons (accept/reject/cancel)
    ├── WorkerBookingActionModal.tsx       # Modal xác nhận action
    └── WorkerBookingActionModal.module.scss
```

## API Integration
| Hook | API Endpoint | Query Key | Mô tả |
|------|-------------|-----------|-------|
| `useQuery` | `bookingApi.getMyBookings()` | `["worker-bookings", query]` | Danh sách booking |
| `useStandardizedMutation` | `bookingApi.updateBookingStatus()` | - | Accept/reject booking |
| `useStandardizedMutation` | `bookingApi.cancelBooking()` | - | Hủy booking |
| `useApiQueryData` | `/services` | `["all-services"]` | Map service code → tên dịch vụ |

## State Management
- **Hook**: `useMobile()` — phát hiện mobile viewport để toggle table/cards
- **Filters**: `statusFilter`, `paymentStatusFilter`, `dateRange`
- **Modal**: `actionModalOpen`, `currentBookingId`, `currentAction`, `workerResponse`, `cancelReason`

## Booking Flow
```
PENDING → ACCEPTED (worker accept)
PENDING → REJECTED (worker reject)
ACCEPTED → CANCELLED (worker cancel with reason)
```

## Debug Guide
1. **Table không hiển thị**: Kiểm tra `bookingsData` response, `createWorkerBookingColumns()` return
2. **Action không hoạt động**: Kiểm tra `updateStatusMutation` / `cancelBookingMutation`, xem network errors
3. **Mobile card không hiển thị**: Kiểm tra `useMobile()` hook, `WorkerBookingCard` props
4. **Filter không reset page**: Kiểm tra `setPage(PAGINATION_DEFAULTS.PAGE)` khi thay đổi filter
