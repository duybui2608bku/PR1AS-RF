# Legal Responsibility (Trách nhiệm pháp lý)

A static legal/compliance page plus a first-week popup that surfaces PR1AS's
accountability principles and Ministry-of-Industry-and-Trade (Bộ Công Thương)
dossier components.

> Despite being referred to as a "miễn trừ trách nhiệm" (disclaimer), the
> content is the opposite: it asserts accountability — there is a responsible
> legal entity and **no** waiver of liability for civil transactions. The
> route/title is therefore `legal-responsibility` / "Trách nhiệm pháp lý".

## Scope

1. **Static page** `/legal-responsibility` — accountability principles (2) +
   dossier components submitted to the Ministry of Industry and Trade (7).
2. **Popup** that auto-shows for logged-in users whose account was created
   within the last 7 days, with a "hide for 6 hours" action.

## Placement

- **Desktop**: link in the footer, inside the existing **Pháp lý / legal**
  group (`pr1as-client/config/nav.ts` → `footerNav`).
- **Mobile**: the footer is hidden on mobile, so the link also lives in the
  Settings page `infoLinks` array (`pr1as-client/app/settings/page.tsx`),
  alongside privacy/terms/cookies.

## Popup gating logic (client-side only)

- Audience: **logged-in users only** — `created_at` only exists for accounts;
  guests have no account age. Gate with `useAuthStore(s => s.user)` +
  `useHasHydrated()`.
- **Trigger is route-based, not once-per-login**: sessions persist for a long
  time, so the notice re-appears on **every visit to the home page `/about`**
  (`/` server-redirects there via `app/page.tsx`). Uses `usePathname()` and an
  effect that opens only when `pathname === "/about"`.
- Show when: `isAuthenticated && pathname === "/about" && user.created_at` is
  within **7 days** of now `&& (no dismiss timestamp || now - dismissTs > 6h)`.
- Closing via X / "got it" only closes for the current visit — it shows again on
  the next landing on `/about`. **Only** the "hide for 6 hours" action
  suppresses it: persist a dismiss timestamp in **localStorage keyed by user id**
  (per-device; switching device/browser re-shows — acceptable for this notice).

## Key implementation facts

- **`created_at` already reaches the client**: `SERVER/src/utils/user.helper.ts`
  `toPublicUser()` serializes `created_at`. Only the frontend `AuthUser` type
  (`pr1as-client/lib/store/auth-store.ts`) needed `created_at?: string` added —
  **no backend change required**.
- **Page** mirrors `app/terms/page.tsx` (server component, `getTranslations`,
  `<SiteLayout>`, content from `messages/{locale}.json`, list via `t.raw(...)`)
  and `app/terms/layout.tsx` (`createPageMetadata` from SEO namespace).
- **Popup** mirrors `components/providers/onboarding-role-modal.tsx`; mounted in
  `components/providers/index.tsx` next to `OnboardingRoleModal` /
  `BannedAccountModal`.
- **i18n** (invariant: all 3 locales en/vi/zh):
  - `LegalResponsibility` namespace — `title`, `intro`, `principlesTitle`,
    `principles[]`, `dossierTitle`, `dossier[]`.
  - `LegalResponsibilityModal` namespace — `title`, `description`, `viewFull`,
    `dismiss6h`, `acknowledge`.
  - `Footer.legalResponsibility`, `Settings.legalRespLabel` / `legalRespDesc`,
    `SEO.legalResponsibilityTitle` / `legalResponsibilityDescription`.
