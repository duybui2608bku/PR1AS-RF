/**
 * Multi-currency support.
 *
 * VND is the platform's pivot/base currency: every amount is normalised to
 * VND for storage and comparison. Worker prices are entered in one of the
 * supported currencies below and converted to VND via these hard-coded rates.
 *
 * This file is the SINGLE SOURCE OF TRUTH for exchange rates. The frontend
 * mirror (`pr1as-client/lib/currency.ts`) must be kept in sync, but only the
 * value computed here (`price_vnd`) is trusted/persisted server-side.
 */

export enum CurrencyCode {
  VND = "VND",
  CNY = "CNY",
  JPY = "JPY",
  KRW = "KRW",
  USD = "USD",
}

export const SUPPORTED_CURRENCY_CODES = Object.values(CurrencyCode);

export const DEFAULT_CURRENCY = CurrencyCode.VND;

/** How many VND one unit of the currency is worth (snapshot, hard-coded). */
export const CURRENCY_RATES_TO_VND: Record<CurrencyCode, number> = {
  [CurrencyCode.VND]: 1,
  [CurrencyCode.CNY]: 3900,
  [CurrencyCode.JPY]: 165,
  [CurrencyCode.KRW]: 17,
  [CurrencyCode.USD]: 26000,
};

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCY_CODES as string[]).includes(value);
}

/** Exchange rate for a currency, falling back to VND (1) when unknown. */
export function getExchangeRate(currency: string): number {
  return isSupportedCurrency(currency)
    ? CURRENCY_RATES_TO_VND[currency]
    : CURRENCY_RATES_TO_VND[CurrencyCode.VND];
}

/** Convert an amount in the given currency to its VND value. */
export function toVnd(price: number, currency: string): number {
  return Math.round(price * getExchangeRate(currency));
}
