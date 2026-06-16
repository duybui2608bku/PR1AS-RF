# Memory Bank - Multi-Currency

## Purpose

PR1AS supports multiple display currencies while keeping VND as the pivot
currency for storage, comparison, wallet operations, pricing packages, and
financial reconciliation.

This is not a live foreign-exchange system. Rates are hard-coded snapshots in
the backend and mirrored on the frontend for display.

Primary source files:

- Backend constants: `SERVER/src/constants/currency.ts`
- Worker service validation:
  `SERVER/src/validations/worker/worker-service.validation.ts`
- Worker service model:
  `SERVER/src/models/worker/worker-service.ts`
- Worker service logic:
  `SERVER/src/services/worker/worker-service.service.ts`
- Frontend currency helpers: `pr1as-client/lib/currency.ts`
- Frontend currency store: `pr1as-client/lib/store/currency-store.ts`
- Frontend hook: `pr1as-client/lib/hooks/use-currency.ts`
- Header/settings UI: `pr1as-client/components/layout/site-header.tsx`,
  `pr1as-client/components/layout/mobile-prefs-sheet.tsx`
- Worker setup UI: `pr1as-client/app/worker/setup/*`

## Supported Currencies

Backend source of truth: `SERVER/src/constants/currency.ts`.

| Code | Meaning | Decimals | 1 unit = VND |
| --- | --- | --- | --- |
| `VND` | Vietnamese dong | 0 | 1 |
| `CNY` | Chinese yuan | 2 | 3900 |
| `JPY` | Japanese yen | 0 | 165 |
| `KRW` | Korean won | 0 | 17 |
| `USD` | United States dollar | 2 | 26000 |

Constants/helpers:

- `CurrencyCode`
- `SUPPORTED_CURRENCY_CODES`
- `DEFAULT_CURRENCY = "VND"`
- `CURRENCY_RATES_TO_VND`
- `getExchangeRate(code)`
- `toVnd(amount, code)`
- `isSupportedCurrency(code)`

The frontend mirror in `pr1as-client/lib/currency.ts` must match backend rates.
The backend remains authoritative for computed persisted values.

## Core Rule: VND Is the Pivot

There are two classes of money values:

| Kind | Examples | Storage rule |
| --- | --- | --- |
| Worker-entered service prices | Worker service pricing tiers | Store original `price` + `currency` + rate snapshot + computed `price_vnd`. |
| Platform money | Wallet, deposits, pricing packages, boost points, admin analytics | Store in VND; convert only for display. |

Never use a display currency value for:

- wallet balance mutation,
- SePay deposit amount,
- subscription package source price,
- boost point accounting,
- dashboard financial aggregation,
- matching or comparing worker service prices.

## Worker Service Pricing Storage

Worker service pricing rows include:

```ts
{
  unit: PricingUnit;
  duration: number;
  price: number;
  currency: "VND" | "CNY" | "JPY" | "KRW" | "USD";
  exchange_rate: number;
  price_vnd: number;
}
```

Meaning:

| Field | Meaning |
| --- | --- |
| `price` | Amount entered by the worker in `currency`. |
| `currency` | Currency chosen when the worker entered the amount. |
| `exchange_rate` | Snapshot from backend constants at save time. |
| `price_vnd` | Backend-computed `price * exchange_rate`. |

Validation:

- Client may send `price` and `currency`.
- Client must not send `exchange_rate` or `price_vnd`.
- Backend recomputes exchange rate and VND amount.
- Duplicate pricing tiers are rejected by unit/duration.

## Worker Setup Flow

The worker setup page uses the global currency preference for all service price
inputs.

Flow:

1. Currency store hydrates selected currency from cookie/localStorage.
2. Existing pricing is loaded as canonical VND state using `price_vnd` when
   present, falling back to `price`.
3. Inputs show the value converted from VND into the selected currency.
4. If the selected currency is not VND, the UI shows an approximate VND line for
   reference.
5. On submit, edited rows are converted from canonical VND to the selected
   currency and sent as `{ price, currency }`.
6. Backend recomputes `exchange_rate` and `price_vnd`.

Drift protection:

- Worker setup keeps an `originalPricingRef`.
- If a pricing row was not changed, submit preserves its original `price` and
  `currency` instead of re-converting from VND.
- This avoids small rounding drift when a worker saves without editing prices.

Known boundary:

- Admin "create user" has no original pricing to preserve.
- Admin worker edit flows can still introduce small rounding drift if they
  round-trip unchanged non-VND pricing without the same preservation logic.

## Frontend Currency Preference

Files:

- `pr1as-client/lib/currency.ts`
- `pr1as-client/lib/store/currency-store.ts`
- `pr1as-client/lib/hooks/use-currency.ts`

State behavior:

- Default currency is VND during SSR.
- Client hydration reads from cookie and localStorage.
- Updates persist to both cookie and localStorage for one year.
- Cookie uses SameSite=Lax.

UI entry points:

- Authenticated users: avatar menu preferences panel.
- Guests: header currency switcher.
- Mobile users: mobile preferences sheet.
- Admin dashboard: dashboard/sidebar preference control where present.

Helpers:

| Helper | Meaning |
| --- | --- |
| `formatMoney(amountVnd, currency)` | Format a VND source amount into selected currency. |
| `convertVndTo(amountVnd, currency)` | Convert VND source value to selected currency. |
| `convertToVnd(amount, currency)` | Convert input amount in selected currency to VND. |
| `parseAmountInput`, `formatAmountInput` | User-input formatting/parsing. |

## Display Conversion Rules

Use `price_vnd` or VND source values for display conversion.

Converted for display:

- worker cards and worker profile pricing,
- worker suggestions and booking dialog price labels,
- pricing page package values,
- dashboard money values,
- boost panel pricing labels where applicable,
- any public UI that shows a platform VND source price in the selected currency.

Kept as real VND operations:

- wallet balance,
- wallet transaction ledger,
- deposit QR amount,
- SePay webhook amount matching,
- subscription package `PricingPackage.price`,
- admin package price input,
- boost point balance and point costs.

Booking note:

- Booking records store `pricing.unit` and `pricing.quantity` for the selected
  service unit/quantity. The module is reservation-only and does not charge
  wallet funds or escrow money.

## Pricing Package Interaction

Subscription packages are stored in the database through the pricing module.

Important rules:

- Package prices are VND source values in `PricingPackage.price`.
- Public pricing UI may convert package prices for display.
- Direct upgrade and SePay QR purchase use the VND package price from the
  database, not hard-coded frontend values.
- `UserSubscriptionHistory` records the pricing event and amount snapshot.

See [pricing.md](./pricing.md) for the full package lifecycle.

## Price Comparison and Worker Matching

When comparing worker service prices, use VND-comparable values:

```ts
const comparable = pricing.price_vnd ?? pricing.price;
```

Do not compare raw `price` across currencies. Raw `price` means different
things depending on `currency`.

Worker matching and discovery should:

- use `price_vnd` for numeric comparison,
- avoid filtering by identical currency,
- fall back to `price` only for legacy VND-only records.

## Legacy Records

Older worker service records may not have `exchange_rate` or `price_vnd`.

Fallback:

- missing `price_vnd` means treat `price` as VND,
- missing `exchange_rate` means use `1`,
- new saves should populate both fields.

## Checklist When Editing Currency Features

- Backend and frontend rate tables must stay in sync.
- Backend must compute `exchange_rate` and `price_vnd`; never trust the client.
- Wallet and SePay amounts must remain VND.
- Pricing package source prices must remain database-backed VND.
- Worker display should prefer `price_vnd`.
- Inputs must parse according to selected currency decimals.
- Test currency switching with VND and at least one decimal currency such as USD.
