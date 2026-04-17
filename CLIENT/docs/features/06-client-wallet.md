# Client Wallet Feature Documentation

## Tổng Quan
Quản lý ví tiền client: xem số dư, nạp tiền, lịch sử giao dịch.

## Cấu Trúc File
```
app/client/wallet/
├── page.tsx                            # Trang chính (tabs: số dư, nạp, lịch sử)
└── page.module.scss

app/wallet/deposit/
├── callback/page.tsx                   # Callback từ cổng thanh toán
└── callback/page.module.scss
```

## API Integration
| Hook | API Endpoint | Query Key | Mô tả |
|------|-------------|-----------|-------|
| `useQuery` | `walletApi.getBalance()` | `["client-wallet-balance"]` | Số dư ví |
| `useQuery` | `walletApi.getTransactions()` | `["wallet-transactions", query]` | Lịch sử giao dịch |
| `useQuery` | `walletApi.getDepositHistory()` | `["deposit-history"]` | Lịch sử nạp tiền |
| `useQuery` | `walletApi.getWithdrawHistory()` | `["withdraw-history"]` | Lịch sử rút tiền |

### Deposit Callback
`wallet/deposit/callback/page.tsx` — Trang callback khi thanh toán xong.
Dùng `walletApi.verifyDepositCallback()` trực tiếp trong useEffect (one-time).

## State Management
- **Tabs**: `activeTab` (balance/deposit/history)
- **Filters**: `page`, `limit`, transaction type filter
- **Currency**: `useCurrencyStore` cho format VND/USD

## Debug Guide
1. **Số dư sai**: Kiểm tra API response, `formatCurrency()` locale
2. **Callback lỗi**: Kiểm tra URL params (`vnp_ResponseCode`, `vnp_TxnRef`), `verifyDepositCallback()`
3. **Giao dịch không hiển thị**: Kiểm tra query key, pagination params
