# Scan report: CLIENT/app

## 1. Cấu trúc thư mục

```
app/
├── admin/
│   ├── auth/page.tsx + page.module.scss ✓
│   └── dashboard/
│       ├── layout.tsx + layout.module.scss ✓
│       ├── page.tsx, user/, wallet/
│       └── ...
├── auth/
│   ├── layout.tsx + layout.module.scss ✓
│   ├── auth.module.scss (dùng chung) ✓
│   ├── login/page.tsx ✓
│   ├── register/page.tsx ✓
│   └── reset-password/page.tsx ✓
├── chat/
│   ├── chat.module.scss ✓ (+ hiddenInput, SocketDebug refactor)
│   ├── page.tsx ✓
│   └── components/ ConversationList, SocketDebug + SocketDebug.module.scss ✓
├── client/
│   ├── bookings/ page + page.module.scss ✓, CancellationInfoTooltip ✓, BookingListMobile ✓
│   ├── profile/ page + profile.module.scss ✓
│   └── wallet/ (chưa refactor)
├── components/
│   └── *.module.scss: header, footer, category-section, service-card, bento-grid ✓
├── worker/
│   ├── [id]/ worker-detail.module.scss (có sẵn)
│   ├── setup/ StepLayout, Step1BasicInfo, Step2Services + SCSS ✓
│   ├── bookings/, wallet/, components/ (chưa refactor)
│   └── ...
└── ...
```

## 2. Tổng quan (cập nhật sau refactor)

| Loại | Trước | Sau (hiện tại) |
|------|--------|-----------------|
| File .module.scss | 7 | **45+** |
| File còn inline `style={{}}` | 52 | **~15** |
| Số chỗ inline còn lại | 436 | **~50** (dynamic/legacy) |

## 3. ĐÃ REFACTOR XONG (Row/Col/Space + SCSS)

| File / Nhóm | SCSS |
|-------------|------|
| **admin/auth/page.tsx** | page.module.scss |
| **admin/dashboard/layout.tsx** | layout.module.scss |
| **auth/layout.tsx** | layout.module.scss |
| **auth/login/page.tsx** | auth.module.scss |
| **auth/register/page.tsx** | auth.module.scss |
| **auth/reset-password/page.tsx** | auth.module.scss |
| **chat/page.tsx** (hiddenInput) | chat.module.scss |
| **chat/components/SocketDebug.tsx** | SocketDebug.module.scss |
| **client/profile/page.tsx** | profile.module.scss |
| **client/bookings/page.tsx** | page.module.scss |
| **client/bookings/CancellationInfoTooltip.tsx** | CancellationInfoTooltip.module.scss |
| **client/bookings/BookingListMobile.tsx** | BookingListMobile.module.scss |
| **components/header.tsx** | header.module.scss |
| **components/footer.tsx** | footer.module.scss |
| **components/category-section.tsx** | category-section.module.scss |
| **components/service-card.tsx** | service-card.module.scss |
| **components/bento-grid.tsx** | bento-grid.module.scss |
| **worker/setup/StepLayout.tsx** | StepLayout.module.scss |
| **worker/setup/Step1BasicInfo.tsx** | Step1BasicInfo.module.scss |
| **worker/setup/Step2Services.tsx** | Step2Services.module.scss |
| **worker/bookings/page.tsx** | page.module.scss |
| **worker/bookings/WorkerBookingCard.tsx** | WorkerBookingCard.module.scss |
| **worker/bookings/WorkerBookingActionModal.tsx** | WorkerBookingActionModal.module.scss |
| **worker/bookings/constants/booking.constants.tsx** | booking.constants.module.scss |
| **client/wallet/page.tsx** | page.module.scss |
| **client/wallet/WalletOverviewTab, EscrowHistoryTab, WalletHistoryTab** | *.module.scss |
| **client/wallet/TransactionCard, TransactionCardGrid** | *.module.scss |
| **client/wallet/constants** | wallet.constants.module.scss |
| **client/wallet/deposit/page.tsx** | page.module.scss |
| **client/bookings/ReviewModal.tsx** | ReviewModal.module.scss |
| **client/bookings/constants/client-booking-constants.tsx** | client-booking-constants.module.scss |
| **client/profile/edit/page.tsx** | page.module.scss |
| **worker/[id]/page.tsx** | worker-detail.module.scss (bổ sung) |
| **worker/components/BookingModal.tsx** | BookingModal.module.scss |
| **worker/components/WorkerServices, WorkerReviews** | worker-detail.module.scss (bổ sung) |
| **worker/setup/page.tsx** | page.module.scss |
| **app/page.tsx** | page.module.scss |
| **app/layout.tsx** | layout.module.scss |
| **app/error.tsx** | error.module.scss |
| **app/not-found.tsx** | not-found.module.scss |
| **app/components/avatar-upload.tsx** | avatar-upload.module.scss |
| **app/wallet/deposit/callback/page.tsx** | page.module.scss |

## 4. CHƯA REFACTOR HẾT — còn inline style

| # | File | Ước lượng còn |
|---|------|----------------|
| 1 | admin/dashboard/wallet/page.tsx | 27 |
| 2 | worker/wallet/page.tsx | 25 |
| 3 | terms/page.tsx | 20 |
| 4 | worker/bookings/page.tsx | 18 |
| 5 | privacy/page.tsx | 16 |
| 6 | client/bookings/components/ReviewModal.tsx | 15 |
| 7 | client/wallet/components/WalletOverviewTab.tsx | 12 |
| 8 | worker/components/BookingModal.tsx | 12 |
| 9 | components/service-card.tsx | 12 (một số style dynamic) |
| 10 | client/wallet/components/EscrowHistoryTab.tsx | 9 |
| 11 | client/wallet/components/WalletHistoryTab.tsx | 9 |
| 12 | worker/[id]/page.tsx | 8 |
| 13 | client/profile/edit/page.tsx | 7 |
| 14 | components/avatar-upload.tsx | 7 |
| 15 | client/wallet/page.tsx | 6 |
| 16 | worker/wallet/components/EscrowCard.tsx | 6 |
| 17 | admin/dashboard/user/page.tsx | 6 |
| 18 | client/bookings/page.tsx | 2 (có thể còn ít) |
| 19 | client/bookings/BookingListMobile.tsx | 5 (FontSize, v.v.) |
| 20 | worker/components/WorkerServices.tsx | 5 |
| 21 | worker/components/WorkerReviews.tsx | 5 |
| 22 | wallet/deposit/callback/page.tsx | 5 |
| 23 | worker/bookings/components/WorkerBookingCard.tsx | 4 |
| 24 | client/wallet/components/TransactionCard.tsx | 4 |
| 25 | admin/dashboard/page.tsx | 4 |
| 26 | worker/setup/page.tsx | 4 |
| 27 | error.tsx | 4 |
| 28 | worker/bookings/components/WorkerBookingActionModal.tsx | 2 |
| 29 | worker/bookings/constants/booking.constants.tsx | 3 |
| 30 | client/wallet/constants/index.tsx | 2 |
| 31 | worker/wallet/components/EscrowCardGrid.tsx | 2 |
| 32 | client/wallet/components/TransactionCardGrid.tsx | 2 |
| 33 | client/bookings/constants/client-booking-constants.tsx | 2 |
| 34 | page.tsx (root) | 3 |
| 35 | layout.tsx (root) | 1 |
| 36 | components/header.tsx | 1 |
| 37 | chat/SocketDebug.tsx | 1 (fontSize constant) |
| 38 | worker/components/WorkerCalendar.tsx | 1 |
| 39 | not-found.tsx | 1 |
| 40 | client/wallet/deposit/page.tsx | 1 |
| 41 | auth/login, register, reset-password | 4, 4, 2 (Avatar bg, v.v.) |
| 42 | client/profile/page.tsx | 1 (Avatar bg) |
| 43 | worker/setup/Step1BasicInfo.tsx | 1 (có thể còn) |

## 5. Kết luận

- **Đã làm:** toàn bộ admin/auth, admin/dashboard/layout, auth (layout + login + register + reset-password), chat (page + SocketDebug), client/profile/page, client/bookings (page + CancellationInfoTooltip + BookingListMobile), components (header, footer, category-section, service-card, bento-grid), worker/setup (StepLayout, Step1BasicInfo, Step2Services).
- **Chưa làm hết:** admin/dashboard (wallet, page, user), worker (wallet/page + EscrowCard + EscrowCardGrid, bookings/page + components + constants, [id]/page, BookingModal, WorkerServices, WorkerReviews, WorkerCalendar, setup/page), client (wallet/*, bookings/ReviewModal + constants, profile/edit), terms, privacy, page/layout/error/not-found, wallet/deposit/callback, avatar-upload; một số file đã refactor vẫn còn 1–2 inline (Avatar backgroundColor, fontSize constant) có thể giữ hoặc tách sau.

**Chưa thực hiện chỉnh sửa hết** — còn khoảng **45 file** có inline style, ưu tiên: admin/dashboard/wallet, worker/wallet, terms, privacy, worker/bookings, client/wallet, client/bookings/ReviewModal, các component worker còn lại.

---
*Cập nhật: kiểm tra theo SCAN_REPORT — đã refactor ~20 nhóm/file, còn ~45 file có inline style.*
