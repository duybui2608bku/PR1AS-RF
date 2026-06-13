# Đa tiền tệ (Multi-currency) — Thiết kế

**Trạng thái:** ✅ Đã implement (typecheck FE + BE pass)
**Phạm vi:** Toàn app (`pr1as-client`) + `SERVER`

---

## 1. Yêu cầu

- Worker khi thiết lập dịch vụ & giá (`/worker/setup`) nhập giá theo **đơn vị tiền tệ** mình chọn.
- Hỗ trợ **5 tiền tệ**: 🇻🇳 VND, 🇨🇳 CNY, 🇯🇵 JPY, 🇰🇷 KRW, 🇺🇸 USD.
- **Tỷ giá hard-code** đúng thời điểm hiện tại (không gọi API tỷ giá realtime).
- Currency là **tùy chọn chung toàn cục của user**, đặt trong **dropdown overlay khi nhấn avatar** (mirror pattern `LocaleSwitcher`).
- Currency đang chọn ảnh hưởng **toàn bộ giá hiển thị toàn app** + ô input nhập giá ở worker setup.
- DB lưu: **giá gốc + tỷ giá snapshot + giá quy đổi VND**.

---

## 2. Nguyên tắc cốt lõi: VND là đơn vị gốc (pivot)

> Mọi số tiền trong hệ thống được chuẩn hoá/lưu theo **VND**. Tầng hiển thị mới quy đổi sang currency user đang chọn qua bảng tỷ giá.

Có 2 nhóm giá khác bản chất:

| Nhóm | Ví dụ | Bản chất lưu trữ |
|------|-------|------------------|
| **Giá worker tự đặt** | dịch vụ trong `worker-service` | Lưu **giá gốc + currency + tỷ giá + price_vnd** |
| **Giá nền tảng** | ví, gói subscription, boost point, transaction | Luôn là **VND** trong DB; chỉ **quy đổi khi hiển thị** |

→ Mọi nơi hiển thị dùng chung helper `formatMoney(amountVnd, currency)`: nhận số tiền VND, render theo currency đang chọn.

---

## 3. Bảng tỷ giá hard-code (CẦN BẠN CHỐT SỐ CHÍNH XÁC)

`1 đơn vị ngoại tệ = ? VND` — **đã chốt**:

| Mã | Tên | Symbol | Thập phân | 1 đơn vị = VND |
|----|-----|--------|-----------|----------------|
| VND | Việt Nam | ₫ | 0 | 1 |
| CNY | Trung Quốc | 元 | 2 | 3.900 |
| JPY | Nhật Bản | ¥ | 0 | 165 |
| KRW | Hàn Quốc | ₩ | 0 | 17 |
| USD | Mỹ | $ | 2 | 26.000 |

- **Nguồn chuẩn = BE** (`SERVER/src/constants/currency.constants.ts`) — dùng để tính `price_vnd`.
- FE mirror cùng bảng (`lib/currency.ts`) chỉ để **hiển thị** (suffix, quy đổi tức thời). Hai bảng phải khớp số.

---

## 4. Frontend (`pr1as-client`)

### 4.1 Hằng số & store
- `lib/currency.ts` (mirror `lib/locale.ts`):
  - `SUPPORTED_CURRENCIES`, `CURRENCY_META` (`{ code, label, flag, symbol, decimals, rateToVnd }`).
  - `COOKIE_NAME`, `STORAGE_KEY`, `DEFAULT_CURRENCY = "VND"`.
  - Helper `formatMoney(amountVnd, code)`, `convertVndTo(amountVnd, code)`, `convertToVnd(amount, code)`.
- `lib/store/currency-store.ts` (Zustand persisted, giống `ui-store`): `{ currency, setCurrency }`. Persist sang cookie + localStorage để SSR đọc được.

### 4.2 Selector trong avatar dropdown
- Thêm vào panel overlay `site-header.tsx:442` (state `menuOpen`) một mục chọn currency — list 5 cờ/nhãn, tick mục đang chọn (giống `locale-switcher.tsx`).
- Mobile: thêm vào `components/layout/mobile-more-sheet.tsx`.

### 4.3 Worker setup (`app/worker/setup/page.tsx`)
- Ô input đọc currency toàn cục từ store (KHÔNG còn dropdown-per-service).
- `formatVndInput`/`parseVndInput` → tổng quát hoá theo currency (số thập phân theo `decimals`); suffix đổi theo `symbol`.
- Dưới mỗi ô (khi ≠ VND): dòng `≈ 152.400 ₫` (quy đổi tức thời để worker tham chiếu).
- Submit: gửi `currency` = currency toàn cục; `worker-setup-pricing.ts` bỏ hard-code `"VND"`.

### 4.4 Quy đổi hiển thị toàn app
Thay format giá hiện tại bằng `formatMoney(...)` tại các file:

**Giá worker (hiển thị từ `price_vnd`):**
- `components/worker/worker-services.tsx`, `workers-by-service-list.tsx`, `worker-suggestions.tsx`, `book-worker-dialog.tsx`
- `app/worker/bookings/format.ts`, `app/client/bookings/format.ts` + booking pages

**Giá nền tảng (VND base → display):**
- `components/wallet/*` (`wallet-format.ts`, `wallet-page.tsx`, `wallet-deposit-page.tsx`)
- `components/pricing/*`, `app/pricing/page.tsx`, `app/dashboard/{pricing,transactions,bookings,page}.tsx`
- `components/worker/boost-panel.tsx`
- ⚠️ **Lưu ý nạp/rút ví**: thao tác thật vẫn theo VND; chỉ đổi phần *hiển thị*. Cần kiểm tra kỹ chỗ nạp tiền để không gửi sai số xuống BE.

---

## 5. Backend (`SERVER`)

### 5.1 Model & type — `worker-service`
`WorkerServicePricing` thêm 2 field:
```ts
{
  unit: PricingUnit,
  duration: number,
  price: number,          // giá gốc worker nhập
  currency: string,       // 1 trong 5 mã
  exchange_rate: number,  // snapshot tỷ giá (1 currency = ? VND)
  price_vnd: number,      // = price * exchange_rate (BE tự tính)
}
```
- `models/worker/worker-service.ts`: thêm `exchange_rate`, `price_vnd` vào `pricingSchema`.
- `types/worker/worker-service.ts`: cập nhật interface.

### 5.2 Validation — `worker-service.validation.ts`
- `currency`: đổi từ `.transform(() => "VND")` → `z.enum(["VND","CNY","JPY","KRW","USD"])`.
- `exchange_rate`, `price_vnd`: **KHÔNG nhận từ client** (không khai báo trong schema input).

### 5.3 Service layer — `worker-service.service.ts`
- Khi upsert: với mỗi pricing slot, lấy `rate` từ `currency.constants.ts`, gắn `exchange_rate = rate`, `price_vnd = price * rate`. Client không thể giả mạo.

### 5.4 Hằng số — `SERVER/src/constants/currency.constants.ts` (mới)
- `CURRENCY_RATES` (bảng mục 3) + `SUPPORTED_CURRENCY_CODES`. Nguồn chuẩn.

---

## 6. Dữ liệu cũ (migration)

- Record `worker-service` hiện có: `currency="VND"`, chưa có `exchange_rate`/`price_vnd`.
- Phương án: field mới optional + backfill — coi thiếu `price_vnd` ⇒ `price_vnd = price`, `exchange_rate = 1`. Có thể chạy script backfill 1 lần (giá cũ đều là VND).

---

## 7. Quyết định đã chốt
1. Tỷ giá: USD=26.000, CNY=3.900, JPY=165, KRW=17 (mục 3).
2. Currency mặc định = **VND**.
3. **Viết script backfill** cho data cũ (giá cũ đều VND ⇒ `exchange_rate=1`, `price_vnd=price`).

## 8. Kết quả implement & ranh giới phạm vi

**File chính đã tạo/sửa**
- BE: `constants/currency.ts` (nguồn chuẩn tỷ giá), `scripts/backfill-pricing-vnd.ts` (+ npm script `backfill:pricing-vnd`), model/type/validation/service `worker-service`, `services/user/user.service.ts` (admin create), `services/worker/worker.service.ts` (trả `price_vnd` ra FE).
- FE: `lib/currency.ts`, `lib/store/currency-store.ts`, `lib/hooks/use-currency.ts`, `components/layout/currency-switcher.tsx`. Chỗ chọn currency:
  - **Đã đăng nhập**: `CurrencyOptions` (dropdown inline, không portal — tránh bị click-outside của overlay đóng giữa chừng) trong overlay avatar `site-header.tsx` + `mobile-more-sheet.tsx`.
  - **Khách vãng lai**: icon `CurrencySwitcher` (DropdownMenu) ở header, chỉ render khi `!isAuthenticated` (tránh trùng với overlay avatar).
  - **Admin dashboard** (`AdminDashboardShell`, không dùng SiteHeader): `CurrencyOptions` (dropUp) trong sidebar footer cạnh card admin, ẩn khi sidebar thu gọn.
  - Hydrate preference trong `components/providers/index.tsx`.
- Worker setup: **state lưu giá canonical theo VND**; tầng input/hiển thị quy đổi sang currency toàn cục (`convertVndTo` để hiển thị, `convertToVnd` khi nhập, submit quy đổi VND→currency + làm tròn theo `decimals`). Nhờ vậy đổi tiền tệ KHÔNG làm sai giá trị thật (vd 150.000₫ → đổi USD hiển thị ≈5,77$ và `≈150.000₫`, không còn bị diễn giải nhầm 150.000 thành USD). Draft key `${serviceId}:${unit}:${currency}` để gõ thập phân không bị kẹt. Khi mở trang chỉ tự lấy currency từ data đã lưu **nếu user chưa từng tự chọn** (`!hasStoredCurrency()`).
- Quy đổi hiển thị: giá worker (worker-services, workers-by-service-list, worker-suggestions, book-worker-dialog) dùng `price_vnd`; gói subscription (`pricing-plans.tsx`, `app/pricing/page.tsx` đọc cookie server-side).
- Form admin tạo/sửa worker (`components/dashboard/user-create-form.tsx`, phần "Dịch vụ & Giá"): cũng theo currency toàn cục, state lưu canonical VND, quy đổi ở input/hiển thị/submit như worker setup. Helper `parseAmountInput`/`formatAmountInput` đã tách ra `lib/currency.ts` dùng chung.

**Dashboard admin (đã quy đổi theo currency admin chọn):**
- `dashboard/page.tsx` (tổng tiền giao dịch), `dashboard/transactions/page.tsx` (stats, bảng, modal chi tiết, tooltip + trục Y biểu đồ qua `convertVndTo`). `dashboard/bookings` không hiển thị tiền.

**CỐ TÌNH giữ VND (tiền thật / nguồn chuẩn / input):**
- Số dư ví + lịch sử giao dịch (`wallet-page.tsx`), ô nạp/rút + QR SePay (`wallet-deposit-page.tsx`).
- Modal mua subscription chuyển khoản thật + QR (`pricing-purchase-modal.tsx`).
- Ô **nhập** giá gói subscription: `dashboard/pricing` (admin set giá gói, lưu DB là VND).
- Booking pages: không hiển thị số tiền (chỉ `formatVnd` export chết).

**Lưu ý quan trọng:** Số worker nhập luôn được diễn giải theo currency toàn cục **hiện tại** (input + `≈VND` + payload nhất quán). BE recompute `price_vnd = price × rate` từ bảng tỷ giá → client không giả mạo được. Nếu worker đổi currency giữa chừng mà không sửa số, số hiển thị và số gửi đi vẫn khớp nhau.

**Chạy backfill:** `cd SERVER && npm run backfill:pricing-vnd` (idempotent — bỏ qua slot đã có `price_vnd`).

## 9. Fix rủi ro đã xử lý
- **So sánh giá gợi ý theo VND** (`worker.service.ts` `getComparableCurrentPrices`/`getBestPricingMatch`): trước đây so sánh `price` thô + lọc theo `currency` → sai khi worker dùng tiền khác nhau. Giờ dùng helper `priceVnd(p)=p.price_vnd||p.price` cho cả lọc lẫn `differenceRatio`, bỏ điều kiện currency.
- **Chống drift khi lưu lại giá không sửa** (`worker/setup/page.tsx`): state canonical VND → submit convert sang currency → BE tính lại `price_vnd` gây lệch vài VND mỗi lần lưu. Khắc phục: `originalPricingRef` lưu `{price,currency,price_vnd}` gốc lúc hydrate; khi submit, slot nào canonical VND == `price_vnd` gốc (tức chưa sửa) thì gửi lại `price`+`currency` gốc verbatim → BE tính ra đúng `price_vnd` cũ, không lệch. Slot có sửa mới convert. (Form admin tạo worker: create không có original nên không drift; edit qua admin vẫn có thể lệch nhẹ — chưa xử lý.)
