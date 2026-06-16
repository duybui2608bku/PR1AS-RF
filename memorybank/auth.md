# Memory Bank - Authentication and Account

## Purpose

The auth module owns identity, sessions, roles, profile mutation, email
verification, password reset, Google login, role switching, locale preference,
worker onboarding, and account deletion.

It is not just a token issuer. Many feature gates read fields stored by this
module:

- `roles` and `last_active_role` decide which UI and feature rules apply.
- `status` decides whether a user can continue using HTTP and Socket.IO.
- `verify_email` decides whether login is allowed for password accounts.
- `meta_data.locale` controls transactional and marketing email language.
- `meta_data.pricing_*` is owned by pricing but stored on the user document.
- `created_by_admin` separates admin-provisioned accounts from real users.

Primary source files:

- Routes: `SERVER/src/routes/auth/auth.routes.ts`
- Controller: `SERVER/src/controllers/auth/auth.controller.ts`
- Service: `SERVER/src/services/auth/auth.service.ts`
- Account deletion: `SERVER/src/services/auth/account-deletion.service.ts`
- User service: `SERVER/src/services/user/user.service.ts`
- User repository: `SERVER/src/repositories/auth/user.repository.ts`
- User model: `SERVER/src/models/auth/user.model.ts`
- Auth middleware: `SERVER/src/middleware/auth.ts`
- Auth validation: `SERVER/src/validations/auth/auth.validation.ts`
- User validation: `SERVER/src/validations/user/user.validation.ts`
- Frontend auth service/hook/store: `pr1as-client/services/auth.service.ts`,
  `pr1as-client/lib/hooks/use-auth.ts`,
  `pr1as-client/lib/store/auth-store.ts`

## User Model

Collection: `user` via `SERVER/src/models/auth/user.model.ts`.

Core identity fields:

| Field | Meaning |
| --- | --- |
| `email` | Unique, lowercased email. |
| `password_hash` | Hidden by default; null for Google-only accounts until they set a password. |
| `google_id` | Hidden by default; unique only when it is a string. |
| `avatar`, `full_name`, `phone` | Basic profile fields exposed to clients. |
| `verify_email` | Password accounts must verify email before login. |
| `created_by_admin` | True only for accounts provisioned by admin. |
| `created_at`, `last_login` | Manual timestamps. |

Role/profile fields:

| Field | Meaning |
| --- | --- |
| `roles` | Array containing `client`, `worker`, and/or `admin`. |
| `last_active_role` | Active product mode. Many feature rules use this, not just `roles`. |
| `worker_profile` | Worker public profile subdocument, null until worker setup/become-worker. |
| `client_profile` | Client-side profile subdocument. |
| `coords` | Root-level coordinate object used for worker search. |

Status/session/security fields:

| Field | Meaning |
| --- | --- |
| `status` | Account lifecycle: `active`, `pending_verify`, `inactive`, `banned`, `pending_delete`, `deleted`. |
| `refresh_token_hash` | Hash of current refresh token. Cleared on logout/status changes/password changes. |
| `failed_login_attempts`, `locked_until` | Account-level brute-force lockout. |
| `password_reset_token`, `password_reset_expires` | Hashed reset token and expiry. |
| `email_verification_token`, `email_verification_expires` | Hashed verification token and expiry. |
| `deleted_at` | Set when user requests account deletion. |

`meta_data`:

| Field | Meaning |
| --- | --- |
| `reputation_score` | Current reputation score, default 100. |
| `pricing_plan_code` | Current pricing plan code. |
| `pricing_started_at` | Current plan start time. |
| `pricing_expires_at` | Current plan expiry time. |
| `onboarding_done` | Frontend onboarding completion flag. |
| `locale` | UI/email locale, currently `vi`, `en`, or `zh` from API validation. |

Indexes:

- `email` unique.
- `google_id` partial unique only for string values.
- `status`.
- `created_by_admin`.
- `meta_data.pricing_plan_code + meta_data.pricing_expires_at`.
- password and email token indexes.

## Token and Cookie Rules

Login, Google login, and refresh all return tokens and set HTTP-only cookies:

| Cookie | Path | Max age | Notes |
| --- | --- | --- | --- |
| `token` | `/` | 7 days in controller | Access token cookie used by browser fallback auth. |
| `refreshToken` | `/api/auth/refresh-token` | 7 days | Scoped to refresh endpoint. |

Cookie security:

- Production: `sameSite: none`, `secure: true`.
- Non-production: `sameSite: lax`, `secure: false`.

`authenticate` accepts either `Authorization: Bearer <token>` or the `token`
cookie. For mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) it rechecks the
canonical user status through `getFreshUserStatus`. Safe reads trust the JWT
snapshot unless the route adds `enforceFreshStatus`.

Role middleware:

- `adminOnly = authorize(admin)`
- `workerOnly = authorize(worker)`
- `clientOnly = authorize(client)`

Important nuance: having a role is different from acting as that role. Several
features check `last_active_role`.

## Routes

Mounted under `/api/auth`.

| Method | Route | Auth | CSRF | Purpose |
| --- | --- | --- | --- | --- |
| `POST` | `/register` | No | Yes | Create password account and send verification email. |
| `POST` | `/login` | No | Yes | Login password account, set cookies. |
| `POST` | `/refresh-token` | No | Yes | Rotate/refresh token from cookie or body. |
| `GET` | `/me` | Yes | No | Return public user. |
| `POST` | `/logout` | Yes | Yes | Clear refresh token and cookies. |
| `GET` | `/me/deletion-status` | Yes | No | Precheck account deletion blockers and auth methods. |
| `DELETE` | `/me` | Yes | Yes | Request account deletion. |
| `PATCH` | `/switch-role` | Yes | Yes | Change `last_active_role`. |
| `PATCH` | `/profile` | Yes | Yes | Update worker profile. |
| `POST` | `/become-worker` | Yes | Yes | Add worker role and set worker profile. |
| `PATCH` | `/update-profile` | Yes | Yes | Update basic profile/password/avatar/name/phone. |
| `PATCH` | `/onboarding` | Yes | Yes | Set `meta_data.onboarding_done = true`. |
| `PATCH` | `/locale` | Yes | Yes | Persist `meta_data.locale`. |
| `POST` | `/forgot-password` | No | Yes | Dispatch reset email with generic response. |
| `POST` | `/reset-password` | No | Yes | Reset password from token. |
| `POST` | `/verify-email` | No | Yes | Verify email from token. |
| `POST` | `/resend-verification` | No | Yes | Resend verification email with generic response. |
| `POST` | `/google` | No | Yes | Login/signup with Google ID token. |

Rate limiters:

- `/register`, `/login`, `/google`: `authLimiter`.
- `/refresh-token`: `refreshTokenLimiter`.
- `/forgot-password`, `/resend-verification`: `emailActionLimiter`.
- token actions: `tokenActionLimiter` and `tokenAttemptLimiter`.

## Registration Flow

`POST /api/auth/register` validates:

- `email`: lowercased, trimmed, valid email.
- `password`: min/max plus at least lowercase, uppercase, digit.
- optional `full_name`, `phone`.

Flow:

1. Search existing email.
2. If it exists and is unverified, resend verification email in best-effort
   background style and return `{ requires_email_verification: true }`.
3. If it exists and is already verified, return the same generic verification
   response shape to avoid account enumeration.
4. If new, hash password, create user with `roles: [client]`, `status: active`,
   `verify_email: false`.
5. Generate opaque email verification token, store hash and expiry.
6. Send verification link to `${FRONTEND_URL}/verify-email?token=...`.
7. Return created public user plus `requires_email_verification: true`.

Password-created users cannot login until `verify_email` is true.

## Login Flow

`POST /api/auth/login` validates normalized email and password.

Flow:

1. Load user by email with hidden auth fields.
2. If user is locked until a future time, reject with account locked.
3. Always perform a bcrypt comparison, even for missing users, using a dummy
   hash to reduce account-existence timing leaks.
4. On invalid password, increment failed attempts and possibly set
   `locked_until`.
5. Reject banned, deleted, inactive users.
6. If status is `pending_delete`, successful login restores the account to
   `active` and clears `deleted_at`.
7. Reject unverified email.
8. Reset failed-attempt counters after successful auth.
9. Generate tokens, store refresh token hash, set cookies, return public user
   and tokens.

## Refresh and Logout

Refresh:

1. Read refresh token from scoped cookie or request body.
2. Verify refresh JWT.
3. Load user with `refresh_token_hash`.
4. Reject banned, inactive, pending-delete, deleted, unverified users.
5. Hash presented token and compare with `timingSafeEqual`.
6. If hash mismatch, clear stored refresh token to stop reuse.
7. Generate a new token pair and set cookies.

Logout:

- Clears stored refresh token.
- Clears both cookies.

Password change:

- `PATCH /update-profile` clears refresh token when a password is changed.
- Google-only users can set their first password without `old_password`.
- Existing password accounts must provide valid `old_password`.

## Google Login

`POST /api/auth/google` accepts `id_token` or `credential`.

Flow:

1. Verify the ID token with `google-auth-library` against
   `config.googleClientId`.
2. Require `sub`, `email`, and `email_verified`.
3. If `google_id` already exists, use that user.
4. Else if email exists and has no conflicting `google_id`, link the Google ID.
5. Else create a new verified client account.
6. Reject banned, deleted, inactive users.
7. Restore `pending_delete` users on successful login.
8. Generate tokens and set cookies.

The user model uses a partial unique index for `google_id` so many non-Google
users can have `google_id: null`.

## Role Switching and Worker Conversion

`PATCH /switch-role`:

- Accepts `last_active_role` of `client` or `worker`.
- User must already have the target role.
- Does not create worker profile or services.

`POST /become-worker`:

- Validates `worker_profile` and `confirm: true`.
- Adds worker role if missing.
- Sets `last_active_role` to `worker`.
- Updates root `coords` separately from `worker_profile`.
- Logs audit context from request IP and user-agent.

`PATCH /profile`:

- Requires user already has worker role.
- Updates `worker_profile`.
- `coords` from request are stored at root `coords`, not inside the
  `worker_profile` subdocument.

Worker services are managed separately by the worker service module.

## Basic Profile and Locale

`PATCH /update-profile` can update:

- `avatar` (normalized URL or null).
- `full_name` (non-empty or null).
- `phone` (phone-like string or null).
- `password`.

At least one field must be provided.

`PATCH /locale` accepts only `vi`, `en`, or `zh` and writes
`meta_data.locale`. Transactional notifications and email templates read this
field when choosing localized content.

## Account Deletion

Deletion is a delayed lifecycle flow, not immediate hard delete.

Precheck: `GET /api/auth/me/deletion-status`.

Returns:

- `has_password`: whether password confirmation can be used.
- `has_google`: whether Google is linked.
- `blockers`: deletion blockers.

Deletion blockers:

| Code | Meaning |
| --- | --- |
| `WALLET_BALANCE` | Wallet balance is greater than 0. |
| `ACTIVE_BOOKINGS` | User still has active bookings. |
| `OPEN_DISPUTES` | User has open disputes. |

Request deletion: `DELETE /api/auth/me`.

Rules:

1. User must be `active`.
2. User must have password auth and provide a valid password.
3. Deletion gate must have no blockers.
4. User transitions to `pending_delete`.
5. `deleted_at` is set.
6. Refresh token is cleared.
7. User status cache is invalidated.
8. All user sockets are disconnected.
9. Response includes `restore_until = deleted_at + 30 days`.

Restore:

- A `pending_delete` user can restore by successfully logging in during the
  30-day grace window.

Final scrub:

- `scrubAndCascade` marks user `deleted`, replaces PII with sentinel values,
  clears auth tokens, soft-deletes posts/comments, removes reactions/favorites,
  removes push/preference records, disables worker services, and deletes worker
  blackouts.

## Admin Status Changes

Admin user status changes are in `userService.updateUserStatus`.

Allowed admin-set statuses:

- `active`
- `inactive`
- `banned`

Disallowed through admin status endpoint:

- `pending_verify`
- `pending_delete`
- `deleted`

Reason: these lifecycle states are owned by email verification and deletion
flows, and manually setting them would skip invariants such as `deleted_at`.

When a user becomes banned or inactive:

- Refresh token is cleared.
- User status cache is invalidated.
- All sockets are disconnected.
- Ban emits `account:banned` before disconnecting.
- Ban sends in-app notification and best-effort email.

Unban creates an account-unbanned notification.

## Security Notes

- Mutating auth routes use CSRF middleware.
- Auth controller stores auth tokens in HTTP-only cookies.
- Login uses account-level lockout, not just IP rate limiting.
- Forgot-password and duplicate-register responses are generic to avoid account
  enumeration.
- Password reset and email verification tokens are stored as hashes.
- Refresh token reuse clears the stored refresh hash.
- Mutations recheck canonical status so banned/deactivated users are cut off
  before the access token naturally expires.
- Safe GET routes usually trust token snapshot unless `enforceFreshStatus` is
  explicitly chained.

## Frontend Surfaces

Primary frontend surfaces:

- `pr1as-client/app/(auth)/login/page.tsx`
- `pr1as-client/app/(auth)/register/page.tsx`
- `pr1as-client/app/(auth)/reset-password/page.tsx`
- `pr1as-client/app/(auth)/verify-email/page.tsx`
- `pr1as-client/app/settings/page.tsx`
- `pr1as-client/app/worker/setup/page.tsx`
- `pr1as-client/components/layout/site-header.tsx`
- `pr1as-client/lib/store/auth-store.ts`
- `pr1as-client/lib/hooks/use-auth.ts`

The frontend also has Next.js auth proxy routes under
`pr1as-client/app/api/auth/*` to support browser cookie/session restoration.

## Common Implementation Checklist

When changing auth/account behavior:

1. Update backend validation.
2. Update `AuthController` route handler.
3. Update service and repository behavior.
4. Check cookie/token side effects.
5. Check `authenticate`/status-cache behavior for banned, inactive, deleted,
   and pending-delete users.
6. Update `toPublicUser` fields if the frontend needs new user data.
7. Update frontend auth service, hook, and store types.
8. Check role-specific route behavior in `role-routes`.
9. Update notification/email template behavior if user status or locale is
   involved.

## Known Implementation Nuances

- The controller cookie max age is 7 days for both token and refresh token.
  Do not document the access cookie as 15 minutes unless JWT utility expiry is
  separately changed and verified.
- `pending_verify` exists in the enum but password registration currently
  creates `status: active` with `verify_email: false`; login enforces email
  verification through `verify_email`.
- `created_by_admin` is important: admin-created accounts are trusted and
  editable by admin; self-registered users are read-only in the admin edit
  flow.
- `coords` are root-level user data even though worker profile validation
  accepts them inside `worker_profile`.
- `last_active_role` is often more important than `roles` for feature behavior.
- Notifications are only delivered to users with `status: active`.
