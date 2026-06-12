import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/locale"

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get(LOCALE_COOKIE_NAME)?.value as SupportedLocale | undefined
  const locale: SupportedLocale =
    raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw) ? raw : DEFAULT_LOCALE

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
