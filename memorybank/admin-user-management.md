# Memory Bank - Admin User Management

## Purpose

Admin user management lets an admin list users, create client/worker accounts,
view user detail, edit admin-provisioned users, and change account status.

The important distinction is `created_by_admin`:

- Accounts created through normal registration or Google login are real user
  accounts and are mostly read-only from admin edit.
- Accounts created by admin are marked `created_by_admin: true`, verified
  immediately, and can be fully edited by admin later.

Primary source files:

- Routes: `SERVER/src/routes/user/user.routes.ts`
- Controller: `SERVER/src/controllers/user/user.controller.ts`
- Service: `SERVER/src/services/user/user.service.ts`
- User repository: `SERVER/src/repositories/auth/user.repository.ts`
- User model: `SERVER/src/models/auth/user.model.ts`
- Create validation: `SERVER/src/validations/user/admin-create-user.validation.ts`
- Update validation: `SERVER/src/validations/user/admin-update-user.validation.ts`
- Status validation: `SERVER/src/validations/user/user.validation.ts`
- Worker service repository:
  `SERVER/src/repositories/worker/worker-service.repository.ts`
- Frontend users list: `pr1as-client/app/dashboard/users/page.tsx`
- Frontend create: `pr1as-client/app/dashboard/users/create/page.tsx`
- Frontend edit: `pr1as-client/app/dashboard/users/[id]/edit/page.tsx`
- Shared form: `pr1as-client/components/dashboard/user-create-form.tsx`
- Frontend service/hook: `pr1as-client/services/user.service.ts`,
  `pr1as-client/lib/hooks/use-users.ts`

## Routes

Mounted under `/api/users`.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/me/post-stats` | Any authenticated user | Return current user's post quota/stats. |
| `GET` | `/` | Admin | Paginated user list with filters. |
| `POST` | `/` | Admin + CSRF | Create an admin-provisioned user. |
| `GET` | `/:id` | Admin | Return user detail plus worker services. |
| `PUT` | `/:id` | Admin + CSRF | Edit an admin-provisioned user. |
| `PATCH` | `/:id/status` | Admin + CSRF | Change account status. |

All admin routes use `authenticate` and `adminOnly`.

## User List

`GET /api/users` uses pagination middleware and `getUsersQuerySchema`.

Filters:

| Query | Meaning |
| --- | --- |
| `search` | Regex search over `full_name`, `email`, and `phone`. |
| `role` | Matches `roles`. |
| `status` | Matches `status`. |
| `startDate`, `endDate` | Filters `created_at`. |
| `created_by_admin` | `"true"` for admin-created users, `"false"` for real users. |

Sorting:

- `created_at: -1`.

Response:

- Uses `PaginationHelper.format`.
- Users are converted through `toPublicUser`.

## Create User Flow

`POST /api/users` validates with `adminCreateUserSchema`.

Base required fields:

| Field | Rule |
| --- | --- |
| `email` | Required, lowercased, valid email. |
| `password` | Required, min/max validation. |
| `full_name` | Required, non-empty, max full-name limit. |
| `phone` | Optional nullable phone-like string. |
| `avatar` | Optional normalized URL or null. |
| `roles` | Array of `client` and/or `worker`; default `[client]`. |
| `status` | `active`, `inactive`, or `banned`; default `active`. |

Worker-specific fields:

| Field | Rule |
| --- | --- |
| `worker_profile` | Required when `roles` includes `worker`. |
| `worker_services` | Required and non-empty when `roles` includes `worker`. |

Worker service input:

| Field | Rule |
| --- | --- |
| `service_code` | Required, uppercased, must map to an active catalog service. |
| `pricing` | At least one pricing row. |
| `pricing[].unit` | `HOURLY`, `DAILY`, or `MONTHLY`. |
| `pricing[].duration` | Integer >= 1. |
| `pricing[].price` | Number > 0. |
| `pricing[].currency` | Optional. Unsupported or missing defaults to VND in service logic. |

Service flow:

1. Normalize email.
2. Reject duplicate email.
3. If worker role is requested, ensure roles become `[client, worker]`.
4. Set `last_active_role = worker` for worker accounts, otherwise `client`.
5. Resolve every `service_code` to an active service.
6. Reject duplicate service codes.
7. Convert pricing to include `currency`, `exchange_rate`, and `price_vnd`.
8. Hash password.
9. Create user with `verify_email: true`, `created_by_admin: true`,
   `onboarding_done: true`, and default locale `vi`.
10. Create wallet with balance 0.
11. If worker, create/find point wallet and upsert worker services.
12. Log `ADMIN_CREATE_USER`.

Important: admin-created accounts skip email verification and can log in
immediately with the admin-set password.

## Edit User Flow

`PUT /api/users/:id` validates with `adminUpdateUserSchema`.

Allowed edit fields:

- `email` optional.
- `password` optional.
- `full_name` required.
- `phone` optional nullable.
- `avatar` optional nullable.
- `roles`.
- `status`.
- `worker_profile` if worker.
- `worker_services` if worker.

Rules:

1. User must exist.
2. User must have `created_by_admin: true`.
3. Changing email checks duplicate email.
4. Existing admin role is preserved even though the form toggles only
   client/worker.
5. If worker role is present, roles become at least `[client, worker]`.
6. If worker role is removed, roles become `[client]` plus preserved `admin`
   if applicable.
7. `last_active_role` remains `admin` if it was admin; otherwise worker users
   become active worker and non-workers become active client.
8. Worker services are replaced, not merged:
   - delete all existing worker services,
   - recreate/upsert submitted services if worker role remains.
9. Wallet and point-wallet balances are not reset.
10. User status cache is invalidated.
11. Log `ADMIN_UPDATE_USER`.

Only admin-provisioned users can be edited. Real registered users should not be
silently overwritten from this form.

## Status Change Flow

`PATCH /api/users/:id/status` validates with `updateUserStatusSchema`.

Admin can set:

- `active`
- `inactive`
- `banned`

Admin cannot directly set:

- `pending_verify`
- `pending_delete`
- `deleted`

Side effects when status becomes banned or inactive:

- Clear refresh token.
- Invalidate user status cache.
- Disconnect all active sockets.
- For ban, emit `account:banned` before disconnect.
- For ban, send account-banned notification and best-effort email.

Side effects when status changes from banned to active:

- Log unban audit.
- Send account-unbanned notification.

## User Detail

`GET /api/users/:id` returns:

- public user fields through `toPublicUser`.
- `worker_services` when the user has worker role.

Worker service detail is returned as:

```ts
{
  service_code: string
  pricing: WorkerServicePricing[]
}
```

The edit form needs this because worker service pricing lives in a separate
collection, not inside the user document.

## Frontend Behavior

Primary UI:

- `/dashboard/users`: list and filters.
- `/dashboard/users/create`: create workspace.
- `/dashboard/users/[id]/edit`: edit admin-created user.
- `components/dashboard/user-create-form.tsx`: shared create/edit form.

Currency behavior in admin worker pricing:

- Form stores draft prices canonically in VND.
- UI displays/accepts values in selected display currency.
- Before submit, frontend converts VND to selected currency and sends
  `{ unit, duration, price, currency }`.
- Backend recomputes `exchange_rate` and `price_vnd`.

Worker role behavior:

- A worker account is also a client so they can switch back to client mode.
- Creating a worker account also creates a worker point wallet.
- Worker service rows are required for worker accounts so the worker can appear
  in discovery and be bookable.

## Data Ownership

| Data | Source of truth |
| --- | --- |
| Basic identity/profile | `user` collection. |
| Worker profile | `user.worker_profile`, with `coords` at root. |
| Worker services/pricing | `worker_service` collection. |
| Wallet balance | `wallet` collection. |
| Worker point wallet | `worker_point_wallet` collection. |
| Pricing plan | `user.meta_data.pricing_*` plus subscription history. |

## Common Implementation Checklist

When changing admin user management:

1. Update create/update Zod schema.
2. Update `userService.createUserByAdmin` or `updateUserByAdmin`.
3. Keep service-code resolution against active catalog services.
4. Keep duplicate service-code validation.
5. Keep worker service replacement semantics during edit.
6. Keep real users protected by `created_by_admin`.
7. Update frontend form types and payload mapping.
8. Check currency conversion in admin worker service pricing.
9. Check status-change side effects and socket/session invalidation.

## Known Implementation Nuances

- `adminUpdateUserSchema` requires `full_name`, roles, and status. It is not a
  sparse PATCH; it is a full edit payload.
- `worker_profile.coords` is accepted by validation but stripped before storing
  admin-created worker profile because `coords` is root-level user data.
- Admin-created users default to locale `vi`, while normal user default in model
  is `en`.
- Update deletes all worker service rows before recreating worker services. If a
  UI omits an existing service, it is removed.
- Admin status route is separate from full edit route; both can affect status,
  but the status route has extra ban/unban side effects.
