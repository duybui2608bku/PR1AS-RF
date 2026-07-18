# Memory Bank - Plan Upgrade Gating

## Purpose

Shared UI/backend pattern so that when a user's subscription plan (see
`memorybank/pricing.md`) blocks an action, the product shows a consistent
"upgrade required" prompt instead of a dead-end error. This module is a thin
cross-cutting layer over three existing feature areas — worker messaging, post
creation, and profile boost — not a new domain of its own.

Primary source files:

- Shared dialog store: `pr1as-client/lib/store/upgrade-plan-store.ts`
- Shared gate hook: `pr1as-client/lib/hooks/use-require-plan.ts`
- Shared dialog component: `pr1as-client/components/plan/upgrade-plan-dialog.tsx`
- Mounted globally in: `pr1as-client/components/providers/index.tsx`
- Shared backend package lookup: `SERVER/src/services/pricing/pricing.service.ts`
  (`getActivePackageForUser`)
- Messaging gate: `pr1as-client/components/worker/worker-services.tsx`
- Post creation gate: `pr1as-client/components/post/create-post-form.tsx`,
  `pr1as-client/lib/hooks/use-posts.ts` (`useMyPostStats`, `useCreatePost`)
- Boost gate: `SERVER/src/services/boost/boost.service.ts`,
  `SERVER/src/repositories/boost/worker-boost.repository.ts`,
  `pr1as-client/components/worker/boost-panel.tsx`
- Defense-in-depth: `pr1as-client/lib/axios.ts` (`plan:restricted` window event)

## Design Decisions

Confirmed with product owner before implementation:

1. **Scope is exactly 3 actions**: messaging a worker, creating a post/job,
   activating profile boost. `ads_enabled` is explicitly excluded — it is a
   display-only flag with no bound user action.
2. **Interaction pattern**: the original action button (label, icon, position)
   is unchanged. When the action is plan-restricted, clicking it opens a
   shared dialog instead of performing the action — the button itself is
   never swapped for an "Upgrade" button and is never hard-`disabled` (it must
   stay clickable so it can open the dialog; style with `opacity-60` +
   `aria-disabled` instead, matching the pre-existing messaging button
   treatment).
3. **Dialog CTA**: always the generic "Nâng cấp gói" button navigating to
   `/pricing`. The dialog does not compute or suggest a specific minimum
   required plan tier — only the description text varies per blocked feature.

## Shared Dialog Architecture

Modeled directly on the pre-existing auth-required-gate pattern
(`lib/store/auth-dialog-store.ts` / `lib/hooks/use-auth-required.ts` /
`components/auth/auth-required-dialog.tsx`):

- `useUpgradePlanStore` — Zustand store: `{ open, reason, openUpgradeDialog(reason), closeUpgradeDialog() }`.
  `reason` is one of `"messaging" | "post" | "boost" | "generic"` and only
  changes the dialog's description copy.
- `useRequirePlan()` — exposes `requirePlan(allowed, reason, callback)`: runs
  `callback` if `allowed`, otherwise opens the dialog with `reason`.
- `<UpgradePlanDialog />` — single global dialog (Crown icon, fixed title,
  reason-dependent description, "Để sau" / "Nâng cấp gói" → `/pricing`
  buttons), mounted once next to `<AuthRequiredDialog />`. Also owns a
  `window.addEventListener("plan:restricted", ...)` listener for the
  defense-in-depth path (see below).

Any future plan-gated action should reuse this triad rather than inventing a
local dialog — this is the second occurrence of the pattern (after messaging)
generalized into a shared component specifically so a third doesn't repeat it
ad hoc again.

## Per-Action Gating

### Messaging (`messaging_enabled`)

Unchanged mechanism, refactored onto the shared pattern: `worker-services.tsx`
still derives `canMessageWorker` from `useMyPricing()`
(`pr1as-client/lib/hooks/use-pricing.ts`), still falls back to the cached
`auth-store` plan code while pricing is loading. `handleMessage` now calls
`requirePlan(canMessageWorker, "messaging", () => router.push(...))` instead
of a local `upgradePlanOpen` state.

No backend enforcement — see `memorybank/pricing.md` "Messaging nuance" for
why (chat authorization is booking-relationship-based, not plan-based). Not
addressed by this feature; still frontend-only.

### Post / Job Creation (`create_job_enabled`, `create_job_limit`)

Backend enforcement already existed
(`SERVER/src/services/post/post.service.ts` `assertUserCanCreatePost`,
throwing `POST_CREATE_FEATURE_DISABLED` / `POST_MONTHLY_LIMIT_EXCEEDED`) —
this feature adds the missing frontend layer:

- `useMyPostStats()` (new, in `lib/hooks/use-posts.ts`) reads
  `GET /api/users/me/post-stats`, which already returns `can_create_post`
  pre-computed server-side.
- `create-post-form.tsx`'s two open-composer triggers gate through
  `requirePlan(canCreatePost, "post", ...)` before the compose dialog opens.
- `useCreatePost`'s `onError` branches on `error.code`: the two plan codes
  above open the shared dialog; every other code (notably
  `REPUTATION_SCORE_TOO_LOW` and the moderation-restriction `FORBIDDEN`,
  which share the same 403 shape but are not plan-related) falls through to
  the pre-existing generic toast unchanged.

### Profile Boost (`boost_profile_enabled`, `boost_profile_monthly_limit`)

Previously **not enforced anywhere** (see `memorybank/boost.md` "Pricing
Interaction" — the fields were only used to compute bonus boost points on
plan purchase, never to gate `boostService.activate`). This feature adds
first-time enforcement:

- `pricingService.getActivePackageForUser(userId)` — new public method,
  extracted from the DB-package-lookup half of `post.service.ts`'s private
  `getActivePricingPackageForUser` (the moderation-restriction check stays
  local to post service; it is not a generic pricing concern).
- `workerBoostRepository.countActivatedByUserBetween(userId, start, end)` —
  new method. Counting is a plain `countDocuments` over `WorkerBoost.started_at`
  because every `activate()` call inserts a new document that is never
  deleted (`expireOverdue()` only flips `status`) — an expired boost still
  consumed a monthly slot, so both `active` and `expired` rows count.
- `boostService.activate()` gains a gate before the existing "one active
  boost" check: reject with new `ErrorCode.BOOST_PLAN_FEATURE_DISABLED` if
  `boost_profile_enabled` is false, or `ErrorCode.BOOST_MONTHLY_LIMIT_EXCEEDED`
  if `boost_profile_monthly_limit` is set and this month's activation count
  has reached it.
- `boostService.getStatus()` / `BoostStatusResponse` gains plan-readout
  fields (`can_activate_boost` etc.) so `boost-panel.tsx` can gate
  proactively using the endpoint it already polls every 30s
  (`GET /boost/status`) — no new route.
- `boost-panel.tsx` computes `planBlocked` **separately** from the existing
  `canAfford` (insufficient points) check — these are two distinct block
  reasons with distinct messaging, never conflated.

## i18n

- New next-intl namespace `PlanUpgrade` (title, per-reason description,
  later/confirm labels) across all 4 locale files, replacing the orphaned
  `WorkerProfile.services.upgradeTitle/upgradeDesc/upgradeLater/upgradeConfirm`
  keys that the old inline messaging dialog used.
- New `WorkerBoost.panel.planBlockedHint` key, all 4 locales.
- Two new entries in `pr1as-client/lib/utils/error-handler.ts`'s
  `ERROR_CODE_MESSAGES` for the boost error codes — this map is a separate,
  single hardcoded-Vietnamese lookup (not part of the 4-file next-intl
  system), same place `POST_CREATE_FEATURE_DISABLED` already lives.

## Defense-in-Depth

`pr1as-client/lib/axios.ts`'s response interceptor dispatches a
`plan:restricted` window event (read by `UpgradePlanDialog`) on any 403 whose
`error.code` is a known plan-restriction code. This only ever fires for post
creation and boost (messaging has no backend enforcement, so it can never
produce a matching code) and exists to catch staleness the proactive checks
miss — multi-tab sessions, a 30s-stale boost-status poll, etc.

This reuses the existing `USER_BANNED` 403-handling precedent in the same
interceptor, but reads the correct field path
(`error.response.data?.error?.code`). The pre-existing `USER_BANNED` branch
itself reads a field shape (`data?.error_code`) that does not match the
actual error response shape emitted by
`SERVER/src/middleware/errorHandler.ts` (`{success, statusCode, error: {code,
message}}`) — this looks like a latent bug (banned notification appears to
work mainly through the Socket.IO `account:banned` event instead), spotted
during this work but intentionally left unfixed as out of scope.

## Common Implementation Checklist

When adding a fourth plan-gated action:

1. Reuse `useRequirePlan()` / `<UpgradePlanDialog />` — do not write a new
   local dialog.
2. Add a new `UpgradePlanReason` variant and its description copy in all 4
   locale files under `PlanUpgrade`.
3. Decide proactive (pre-check before allowing the triggering UI to open) vs.
   reactive-only (rely on the `onError`/`plan:restricted` fallback) based on
   whether a cheap readout of the gate already exists — prefer proactive.
4. If backend enforcement doesn't exist yet, add a dedicated `ErrorCode` +
   message mirroring `POST_CREATE_FEATURE_DISABLED`/`BOOST_PLAN_FEATURE_DISABLED`,
   and load the plan via `pricingService.getActivePackageForUser`, not a new
   ad hoc DB query.
5. Keep the original action button's label/position — only the click
   behavior changes when blocked.

## Known Implementation Nuances

- `messaging_enabled` remains frontend-only; do not assume the chat API
  itself is plan-gated.
- Boost monthly-limit counting includes expired boosts (any row with
  `started_at` in the current month), not just currently-active ones.
- The shared dialog's CTA never varies by reason — only the description
  text does. If product later wants a reason-specific or plan-specific CTA,
  that is a deliberate future change, not an oversight.
