# Worker Wallet Feature Documentation

## Tổng Quan
Quản lý ví tiền worker: xem số dư, lịch sử giao dịch escrow, đối soát tiền.

## Cấu Trúc File
```
app/worker/wallet/
├── page.tsx                          # Trang chính (tabs: Tổng quan, Đối soát, Escrow)
├── page.module.scss
└── components/
    ├── EscrowCard.tsx                # Card hiển thị 1 giao dịch escrow
    ├── EscrowCard.module.scss
    ├── EscrowCardGrid.tsx            # Grid layout cho escrow cards (mobile)
    └── EscrowCardGrid.module.scss
```

## API Integration
| Hook | API Endpoint | Query Key | Mô tả |
|------|-------------|-----------|-------|
| `useQuery` | `walletApi.getBalance()` | `["worker-wallet-balance"]` | Số dư ví |
| `useQuery` | `escrowApi.getEscrows()` | `["worker-escrows", query]` | Danh sách escrow |

## State Management
- **Tabs**: `activeTab` (overview/reconciliation/escrow)
- **Filters**: `statusFilter`, `dateRange`, `page`, `limit`
- **Hook**: `useCurrencyStore` cho format tiền tệ

## Debug Guide
1. **Số dư không hiển thị**: Kiểm tra API `/wallet/balance`, query key `["worker-wallet-balance"]`
2. **Escrow list trống**: Kiểm tra filter params, pagination state
3. **Format tiền sai**: Kiểm tra `useCurrencyStore().formatCurrency()`
