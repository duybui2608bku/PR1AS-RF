import { getRequestConfig } from "next-intl/server"
import { cookies, headers } from "next/headers"

import {
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  detectLocaleFromAcceptLanguage,
  type SupportedLocale,
} from "@/lib/locale"

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get(LOCALE_COOKIE_NAME)?.value
  let locale: SupportedLocale
  if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
    locale = raw as SupportedLocale
  } else {
    // No explicit choice yet: detect from the browser's Accept-Language header,
    // falling back to English when nothing matches. The middleware persists this
    // into the NEXT_LOCALE cookie, but detecting here too keeps the very first
    // server render correct regardless of cookie round-trip timing.
    const headerStore = await headers()
    locale = detectLocaleFromAcceptLanguage(headerStore.get("accept-language"))
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
