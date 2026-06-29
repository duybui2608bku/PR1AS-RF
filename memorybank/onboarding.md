# Onboarding

First-run, post-login modal that introduces PR1AS and captures the user's intended
role. Shown once per account until `meta_data.onboarding_done` is set.

## Where it lives

- Component: `pr1as-client/components/providers/onboarding-role-modal.tsx`
  (mounted via `components/providers/index.tsx`).
- Completion hook: `useCompleteOnboarding` (`lib/hooks/use-auth.ts`) → sets
  `meta_data.onboarding_done` on the user.
- i18n namespace: `Onboarding` in `messages/{en,vi,zh}.json`.

## Flow

`Dialog` is force-open (no close button, outside-click/escape disabled) when an
authenticated, hydrated user has not finished onboarding.

Steps = 4 intro slides + 1 role-picker (`TOTAL_STEPS = INTRO_STEPS.length + 1`).

1. `introWelcome` — Welcome to PR1AS
2. `introServices` — Discover services
3. `introPosts` — Community & posts
4. `introBooking` — Book & connect
5. Role picker (`roleStepTitle`) — choose `client` or `worker`

- **Tiếp tục / Next** advances; on the role step it becomes **Bắt đầu ngay / Get Started**
  and calls `handleConfirm` → `completeOnboarding` → if role is `worker`, routes to
  `/worker/setup`.
- **Quay lại / Back** appears from step 2 onward.
- **Bỏ qua / Skip** completes onboarding immediately at any step.

## UI design — Glassmorphism (current)

Chosen direction (mockups were in `onboarding-ui-mockups/`, style 3):

- **Dialog** is a frosted-glass card: semi-transparent bg + `backdrop-blur`, subtle
  white inner highlight, soft outer shadow. Animated blurred color blobs sit behind it
  (purple / blue / emerald) for depth. Works in both light and dark via Tailwind
  `dark:` variants.
- **Progress** dots: inactive = faint, active = wide pill with violet→blue gradient and
  glow, done = mid-opacity.
- **Intro slide**: large gradient icon tile (rounded-3xl) with inner highlight + outer
  radial glow, title, description, and two **feature chips** (glass pills with a colored
  lucide icon). Per-step gradient + glow color + chip set defined in `INTRO_STEPS`.
- **Role picker**: two glass cards, each with a gradient icon, title, desc, badge, and a
  check badge when selected; selected card gets a colored ring (blue for client, emerald
  for worker).
- **Primary button**: violet→blue gradient with glow; ghost Back/Skip row beneath.

### Feature-chip i18n keys (added for the glass design)

`introWelcomeFeat1/2`, `introServicesFeat1/2`, `introPostsFeat1/2`,
`introBookingFeat1/2` — two per intro step, present in all three locale files.

## Conventions to keep

- No semicolons, Tailwind-only styling, `const` arrow handlers prefixed `handle*`.
- All copy via `useTranslations("Onboarding")` — never hard-code; add keys to
  `en`, `vi`, `zh` together.
- Keep the force-open guard (no dismiss via overlay/escape) and the role→`/worker/setup`
  redirect.
