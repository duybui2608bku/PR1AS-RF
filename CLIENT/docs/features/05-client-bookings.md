# Client Bookings Feature Documentation

## Tổng Quan
Quản lý booking phía client: xem, hủy, đánh giá booking.

## Cấu Trúc File
```
app/client/bookings/
├── page.tsx                              # Trang chính (filters + table/cards)
├── page.module.scss
├── constants/
│   └── client-booking-constants.ts       # Columns config, cancellation reasons
└── components/
    ├── BookingListMobile.tsx              # Card list cho mobile view
    ├── BookingListMobile.module.scss
    ├── CancelBookingModal.tsx             # Modal hủy booking
    ├── CancelBookingModal.module.scss
    ├── ReviewModal.tsx                    # Modal đánh giá worker
    └── ReviewModal.module.scss
```

## API Integration
| Hook | API Endpoint | Query Key | Mô tả |
|------|-------------|-----------|-------|
| `useQuery` | `bookingApi.getMyBookings()` | `["client-bookings", query]` | Danh sách booking |
| `useStandardizedMutation` | `bookingApi.cancelBooking()` | - | Hủy booking |
| `useStandardizedMutation` | `reviewApi.createReview()` | - | Đánh giá worker |
| `useApiQueryData` | `/services` | `["all-services"]` | Map service code → tên |

## State Management
- **Responsive**: `Grid.useBreakpoint()` (Ant Design) cho mobile detection
- **Filters**: `statusFilter`, `paymentStatusFilter`, `dateRange`
- **Modals**: `cancelModalOpen`, `reviewModalOpen`, `selectedBookingForReview`

## Debug Guide
1. **Review không gửi được**: Kiểm tra `reviewMutation`, xem `ReviewType` enum
2. **Cancel lỗi**: Kiểm tra `cancelBookingMutation`, require `reason` param
3. **Mobile view**: Dùng `Grid.useBreakpoint()` chứ không phải `useMobile()`
