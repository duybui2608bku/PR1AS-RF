# Memory Bank - Wallet System

## Tổng quan

Hệ thống Wallet cho phép users quản lý số dư và thực hiện các giao dịch nạp tiền qua VNPay. Hệ thống hỗ trợ tracking transactions, balance management và payment gateway integration.

## Kiến trúc

### Backend Components

#### Models (`SERVER/src/models/wallet/`)
- **Wallet Model**: Lưu trữ số dư của user
  - `user_id`: String (unique, indexed)
  - `balance`: Number (min: 0, default: 0)
  - `updated_at`: Date

- **WalletTransaction Model**: Lưu trữ lịch sử giao dịch
  - `user_id`: String (required, indexed)
  - `type`: TransactionType (DEPOSIT, WITHDRAW, PAYMENT, REFUND)
  - `amount`: Number (required)
  - `status`: TransactionStatus (PENDING, SUCCESS, FAILED, CANCELLED)
  - `gateway`: PaymentGateway (VNPAY)
  - `gateway_transaction_id`: String
  - `gateway_response`: Object
  - `description`: String
  - `created_at`: Date
  - `updated_at`: Date

#### Services (`SERVER/src/services/wallet/`)

**wallet.service.ts**:
- `createDepositTransaction()`: Tạo transaction nạp tiền và build VNPay payment URL
- `verifyDepositPayment()`: Verify payment callback từ VNPay và update balance
- `getWalletBalance()`: Lấy số dư hiện tại của user (tính toán từ transactions)
- `getTransactionHistory()`: Lấy lịch sử giao dịch của user với pagination
- `getAdminTransactionHistory()`: Lấy tất cả transactions (admin only)

#### Repositories (`SERVER/src/repositories/wallet/`)
- `walletRepository`: CRUD operations cho WalletTransaction
- `walletBalanceRepository`: CRUD operations cho Wallet balance cache

#### Controllers (`SERVER/src/controllers/wallet/`)
- `createDeposit`: POST `/api/wallet/deposit` - Tạo deposit transaction
- `verifyDepositCallback`: GET `/api/wallet/deposit/callback` - Verify payment callback
- `getBalance`: GET `/api/wallet/balance` - Lấy số dư
- `getTransactionHistory`: GET `/api/wallet/transactions` - Lấy lịch sử giao dịch

### Frontend Components

#### API Client (`CLIENT/lib/api/wallet.api.ts`)
- `createDeposit()`: Tạo deposit request
- `verifyDepositCallback()`: Verify payment callback
- `getBalance()`: Lấy số dư
- `getTransactionHistory()`: Lấy lịch sử giao dịch với filters

#### Pages (`CLIENT/app/client/wallet/`)
- `/client/wallet/deposit`: Deposit page với form và preset amounts
- `/wallet/deposit/callback`: Callback page sau khi payment

#### Constants (`CLIENT/lib/constants/wallet.ts`)
- `WALLET_LIMITS`: Min/max deposit amounts
- `DEPOSIT_AMOUNT_PRESETS`: Preset amounts cho quick deposit
- `TransactionType`, `TransactionStatus`: Enums

## Payment Gateway Integration

### VNPay Integration (`SERVER/src/services/vnpay/`)

**vnpay.service.ts**:
- `buildDepositPaymentUrl()`: Build VNPay payment URL với các params:
  - `vnp_Amount`: Amount * 100 (VNPay expects cents)
  - `vnp_Command`: "pay"
  - `vnp_CreateDate`: Format YYYYMMDDHHmmss
  - `vnp_CurrCode`: "VND"
  - `vnp_IpAddr`: User IP address
  - `vnp_Locale`: "vn"
  - `vnp_OrderInfo`: Order description
  - `vnp_OrderType`: "other"
  - `vnp_ReturnUrl`: Callback URL
  - `vnp_TxnRef`: Transaction ID
  - `vnp_Version`: "2.1.0"

- `verifyPaymentReturn()`: Verify payment callback từ VNPay
  - Checks signature với secure secret
  - Returns: `isSuccess`, `transactionId`, `responseCode`, `amount`, `gatewayTransactionId`

### Configuration (`SERVER/src/config/`)
VNPay config trong environment variables:
```env
VNPAY_TMN_CODE=your-tmn-code
VNPAY_SECURE_SECRET=your-secret-key
VNPAY_HOST=https://sandbox.vnpayment.vn
VNPAY_RETURN_URL=http://localhost:3001/wallet/deposit/callback
VNPAY_TEST_MODE=true
VNPAY_HASH_ALGORITHM=SHA512
```

## Transaction Flow

### Deposit Flow

1. **User initiates deposit**:
   - Frontend: User nhập amount trên `/client/wallet/deposit`
   - Validation: Min/Max amount checks
   - API: `POST /api/wallet/deposit` với `{ amount: number }`

2. **Create transaction**:
   - Backend tạo WalletTransaction với status PENDING
   - Generate transaction ID (MongoDB ObjectId)
   - Build VNPay payment URL với transaction ID
   - Return payment URL cho frontend

3. **Redirect to VNPay**:
   - Frontend redirect user đến VNPay payment page
   - User completes payment trên VNPay

4. **Payment callback**:
   - VNPay redirect về `/wallet/deposit/callback` với query params
   - Frontend gọi `GET /api/wallet/deposit/callback` với query params
   - Backend verify signature và response code
   - Update transaction status:
     - SUCCESS: Update balance, save gateway transaction ID
     - FAILED: Mark transaction as failed

5. **Balance update**:
   - Calculate balance từ tất cả SUCCESS transactions
   - Update Wallet balance cache
   - Return updated balance

## Transaction Types

- **DEPOSIT**: Nạp tiền vào wallet
- **WITHDRAW**: Rút tiền (chưa implement)
- **PAYMENT**: Thanh toán dịch vụ (chưa implement)
- **REFUND**: Hoàn tiền (chưa implement)

## Transaction Status

- **PENDING**: Transaction đang chờ xử lý
- **SUCCESS**: Transaction thành công
- **FAILED**: Transaction thất bại
- **CANCELLED**: Transaction bị hủy

## Balance Management

### Balance Calculation
Balance được tính toán từ tất cả SUCCESS transactions:
```typescript
balance = SUM(amount WHERE type = DEPOSIT AND status = SUCCESS)
        - SUM(amount WHERE type = WITHDRAW AND status = SUCCESS)
        - SUM(amount WHERE type = PAYMENT AND status = SUCCESS)
        + SUM(amount WHERE type = REFUND AND status = SUCCESS)
```

### Balance Cache
- Wallet balance được cache trong Wallet model để tăng performance
- Khi có transaction mới, balance được recalculate và update cache
- Balance cache được sync với calculated balance khi query

## API Endpoints

### POST `/api/wallet/deposit`
Tạo deposit transaction và get payment URL.

**Request**:
```typescript
{
  amount: number; // Min: WALLET_LIMITS.MIN_DEPOSIT_AMOUNT, Max: WALLET_LIMITS.MAX_DEPOSIT_AMOUNT
}
```

**Response**:
```typescript
{
  payment_url: string;
  transaction_id: string;
}
```

**Auth**: Required (authenticate middleware)

### GET `/api/wallet/deposit/callback`
Verify payment callback từ VNPay.

**Query Params**: VNPay callback params (vnp_TxnRef, vnp_ResponseCode, vnp_Amount, etc.)

**Response**: Success/Error message

**Auth**: Required (authenticate middleware)

### GET `/api/wallet/balance`
Lấy số dư hiện tại của user.

**Response**:
```typescript
{
  balance: number;
  user_id: string;
}
```

**Auth**: Required (authenticate middleware)

### GET `/api/wallet/transactions`
Lấy lịch sử giao dịch với pagination và filters.

**Query Params**:
- `type`: TransactionType (optional)
- `status`: TransactionStatus (optional)
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

**Auth**: Required (authenticate middleware)

## Security Considerations

1. **CSRF Protection**: Deposit endpoint có CSRF protection
2. **Amount Validation**: Min/Max limits được validate
3. **Payment Verification**: VNPay signature được verify để prevent tampering
4. **Transaction Ownership**: Verify transaction belongs to authenticated user
5. **Idempotency**: Transaction ID được generate unique để prevent duplicates

## Error Handling

### Common Errors
- `DEPOSIT_AMOUNT_TOO_LOW`: Amount < MIN_DEPOSIT_AMOUNT
- `DEPOSIT_AMOUNT_TOO_HIGH`: Amount > MAX_DEPOSIT_AMOUNT
- `WALLET_NOT_FOUND`: User không tồn tại
- `PAYMENT_VERIFICATION_FAILED`: VNPay signature verification failed
- `TRANSACTION_NOT_FOUND`: Transaction không tồn tại
- `TRANSACTION_FAILED`: Payment failed hoặc unauthorized

## Future Enhancements

- [ ] Withdraw functionality
- [ ] Payment for services
- [ ] Refund system
- [ ] Multiple payment gateways (MoMo, ZaloPay, etc.)
- [ ] Transaction notifications
- [ ] Admin transaction management dashboard
- [ ] Transaction export (CSV/PDF)
- [ ] Balance history chart
- [ ] Auto-refund on service cancellation

