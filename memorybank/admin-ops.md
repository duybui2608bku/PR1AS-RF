# Memory Bank - Admin and Ops Modules

## Purpose

This document covers the smaller platform operations modules that are not owned
by one user-facing workflow: announcements, feedback, email campaigns, site
settings, and admin dashboard analytics.

These modules are still production features. They share the same backend layering
as larger modules and have dashboard surfaces in the client.

Primary source files:

- Announcements:
  `SERVER/src/routes/announcement/announcement.routes.ts`,
  `SERVER/src/controllers/announcement/announcement.controller.ts`,
  `SERVER/src/services/announcement/announcement.service.ts`,
  `SERVER/src/models/announcement/announcement.model.ts`
- Feedback:
  `SERVER/src/routes/feedback/feedback.routes.ts`,
  `SERVER/src/controllers/feedback`,
  `SERVER/src/services/feedback`,
  `SERVER/src/models/feedback/feedback.model.ts`
- Email campaigns:
  `SERVER/src/routes/email-campaign/email-campaign.routes.ts`,
  `SERVER/src/controllers/email-campaign/email-campaign.controller.ts`,
  `SERVER/src/services/email-campaign`,
  `SERVER/src/models/email-campaign/*`,
  `SERVER/src/jobs/email-campaign.job.ts`
- Site settings:
  `SERVER/src/routes/site-settings/site-settings.routes.ts`,
  `SERVER/src/controllers/site-settings`,
  `SERVER/src/services/site-settings`,
  `SERVER/src/models/site-settings/site-settings.model.ts`
- Dashboard analytics:
  `SERVER/src/routes/dashboard/dashboard.routes.ts`,
  `SERVER/src/controllers/dashboard/dashboard.controller.ts`,
  `SERVER/src/services/dashboard/dashboard.service.ts`
- Frontend service/hook/page files:
  `pr1as-client/services/*`,
  `pr1as-client/lib/hooks/*`,
  `pr1as-client/app/dashboard/*`

## Announcements

Announcements are admin-managed banners or notices selected by placement.

Routes:

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `GET` | `/api/announcements/by-placement` | None (public) | Return active announcements for a placement. |
| `GET` | `/api/admin/announcements` | Admin | List announcements. |
| `POST` | `/api/admin/announcements` | Admin + CSRF | Create announcement. |
| `GET` | `/api/admin/announcements/:id` | Admin | Detail. |
| `PATCH` | `/api/admin/announcements/:id` | Admin + CSRF | Update. |
| `DELETE` | `/api/admin/announcements/:id` | Admin + CSRF | Soft delete. |

Model fields:

| Field | Meaning |
| --- | --- |
| `title`, `content` | Localized or display text for the announcement. |
| `images` | Optional image URLs. |
| `display_types` | Display styles used by the client. |
| `display_behavior` | How the UI should present or dismiss the notice. |
| `target_roles` | Audience role filter. |
| `placements` | Slots where the announcement can appear. |
| `redirect_url`, `redirect_target` | Optional click target. |
| `allow_close` | Whether users can close the announcement. |
| `is_active` | Main publish switch. |
| `start_date`, `end_date` | Optional schedule window. |
| `priority` | Higher priority sorts first. |
| `created_by` | Admin who created it. |
| `deleted` | Soft-delete flag. |

Active-by-placement selection:

1. Query filters out deleted and inactive records (no authentication required
   — guests and logged-in users alike can call this).
2. `placements` must include the requested placement.
3. Current time must be within optional `start_date` and `end_date`.
4. Results are sorted by `priority` descending, then creation time descending.

Note: `target_roles` is stored on the model but is **not** currently enforced
anywhere in the query or in the frontend renderer — it exists for future use.
Audience separation today is achieved purely by which `placements` value a
page requests, not by role filtering.

Placements in use (`pr1as-client/config/announcement-placements.ts`):
`home_client_popup/banner/inline` (mounted on `app/services/page.tsx`, the
client/guest services feed), `home_worker_popup/banner/inline` (mounted on
`app/posts/page.tsx`, the worker feed), and `about_popup/banner/inline`
(mounted on `app/about/page.tsx`, the shared landing page for guests, workers,
and clients — see `memorybank/legal-responsibility.md` for why `/about` is the
default landing route).

Frontend dismissal (`lib/utils/announcement-dismissal.ts`) keys localStorage by
user id; guests (no `useAuthStore` user) share one `"guest"` key per device —
see `AnnouncementRenderer.tsx`.

Important nuance:

- There is no public `GET /api/announcements` list route — only `GET
  /by-placement`, which returns a single announcement (or null) for one
  placement value.

## Feedback

Feedback lets authenticated users submit platform feedback and lets admins
triage it.

Routes:

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `POST` | `/api/feedback` | User + CSRF | Submit feedback. |
| `GET` | `/api/feedback/mine` | User | List own feedback. |
| `GET` | `/api/feedback/admin` | Admin | List all feedback. |
| `PATCH` | `/api/feedback/admin/:id/status` | Admin + CSRF | Change status and admin note. |

Model fields:

| Field | Meaning |
| --- | --- |
| `user_id` | Submitter. |
| `type` | `bug` or `feature`. |
| `title` | Short title. |
| `description` | Detailed message. |
| `status` | `open`, `in_progress`, `resolved`, or `rejected`. |
| `admin_note` | Optional admin response/note. |
| `resolved_by`, `resolved_at` | Admin resolution metadata. |
| `created_at`, `updated_at` | Timestamps. |

Flow:

1. User submits feedback through the client form.
2. Admin dashboard lists feedback and filters by status/type.
3. Admin changes status. Resolution metadata is set when appropriate.
4. The module does not automatically create a support chat or ticket; it is a
   lightweight triage queue.

## Email Campaigns

Email campaigns are admin-created bulk emails with localized subject and HTML
content. The module supports drafts, scheduled campaigns, immediate send,
cancellation, and per-recipient send logs.

Routes under `/api/admin/email-campaigns`:

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `GET` | `/` | Admin | List campaigns. |
| `POST` | `/` | Admin + CSRF | Create campaign. |
| `GET` | `/:id` | Admin | Detail. |
| `PATCH` | `/:id` | Admin + CSRF | Update editable campaign. |
| `DELETE` | `/:id` | Admin + CSRF | Delete campaign. |
| `POST` | `/:id/send` | Admin + CSRF | Start sending now. |
| `POST` | `/:id/cancel` | Admin + CSRF | Cancel scheduled/sending campaign when allowed. |
| `GET` | `/:id/logs` | Admin | List recipient send logs. |

Campaign model:

| Field | Meaning |
| --- | --- |
| `name` | Internal campaign name. |
| `subject` | Localized subject map for `vi`, `en`, `zh`. |
| `html` | Localized HTML map for `vi`, `en`, `zh`. |
| `default_locale` | Fallback locale. |
| `audience` | `all`, `clients`, or `workers`. |
| `status` | `draft`, `scheduled`, `sending`, `sent`, `failed`, or `cancelled`. |
| `scheduled_at`, `sent_at` | Schedule/send timestamps. |
| `created_by` | Admin user id. |
| `total_recipients`, `sent_count`, `failed_count` | Delivery counters. |

Send log model:

| Field | Meaning |
| --- | --- |
| `campaign_id` | Campaign reference. |
| `recipient_id`, `recipient_email` | Recipient snapshot. |
| `locale` | Locale used for subject/html selection. |
| `status` | `pending`, `sent`, or `failed`. |
| `sent_at`, `error` | Delivery result. |

Send flow:

1. Admin creates a draft or scheduled campaign.
2. `POST /:id/send` moves the campaign to `sending` and returns before all mail
   is finished.
3. The service sends in batches of 20 recipients.
4. `email-campaign.job.ts` runs every minute and starts due scheduled campaigns.
5. A job lock prevents duplicate scheduled sends across instances.

Important constraints:

- Campaign HTML is generated and sent through Nodemailer.
- Localized content falls back to `default_locale` when a recipient locale is
  missing.
- Send logs are the delivery audit trail; do not rely only on campaign counters.

## Site Settings

Site settings are the singleton source for platform branding, public metadata,
social URLs, and maintenance mode.

Routes:

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `GET` | `/api/site-settings` | Public | Read public-safe settings. |
| `GET` | `/api/site-settings/maintenance` | Public | Lightweight maintenance status. |
| `PATCH` | `/api/site-settings` | Admin + CSRF | Partial update. |
| `POST` | `/api/site-settings/reset` | Admin + CSRF | Reset to defaults. |

Model fields:

| Field | Meaning |
| --- | --- |
| `name`, `shortName` | Brand identity. |
| `description`, `keywords` | Localized SEO fields for `vi`, `en`, `zh`. |
| `logo`, `favicon`, `ogImageUrl` | Branding assets. |
| `siteUrl`, `contactEmail` | Public URLs/contact. |
| `twitter`, `facebook`, `tiktok`, `thread`, `instagram` | Social links. |
| `maintenanceMode`, `maintenanceMessage` | Maintenance controls. |
| `updatedBy`, `updatedAt` | Admin update metadata. |

Behavior:

1. Repository creates default settings on first read if no document exists.
2. Legacy string fields are migrated into localized objects.
3. Partial localized updates are merged so updating one locale does not wipe the
   others.
4. Frontend server helpers read settings during SSR for metadata and maintenance
   checks.

## Dashboard Analytics

Dashboard analytics aggregates admin summary data.

Route:

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `GET` | `/api/admin/dashboard/analytics` | Admin | Return dashboard aggregates. |

Query:

| Query | Meaning |
| --- | --- |
| `start_date` | Optional ISO date. |
| `end_date` | Optional ISO date. |

Validation:

- If both dates are present, `start_date` must be before or equal to `end_date`.
- Default window is the last 30 days.
- Aggregation buckets use UTC day boundaries.

Returned groups:

- `total_users`
- `new_users`
- `user_registrations_by_date`
- `package_registrations_total`
- `package_registrations_by_plan`
- `package_registrations_by_date`

Pricing analytics source:

- Subscription events come from `UserSubscriptionHistory`.
- Successful `upgrade` and `renewal` events count toward package registration
  analytics.
- Pricing package values are DB-backed; do not hard-code plan prices in admin
  dashboard docs or UI.

## Frontend Surfaces

Common locations:

- Announcements: dashboard announcements page and announcement components.
- Feedback: user feedback form plus `/dashboard/feedback`.
- Email campaigns: `/dashboard/email-campaigns`.
- Site settings: `/dashboard/settings`, SSR metadata helpers, maintenance page.
- Analytics: `/dashboard` overview and supporting dashboard services/hooks.

Frontend rules:

- Use the matching service client rather than calling `fetch` ad hoc.
- Mutations need CSRF through the shared axios client.
- Admin pages should rely on backend authorization; client guards are only UI
  protection.
- Money values in analytics are VND source values and should be displayed
  through shared currency helpers when a currency selector is active.

## Checklist When Editing Admin/Ops

- Confirm the route is mounted in `SERVER/src/routes/index.ts`.
- Preserve `authenticate`, `adminOnly`, and CSRF middleware on mutations.
- Keep singleton behavior for site settings.
- Keep scheduled email sending idempotent through status checks and job locks.
- Update dashboard service types when API payloads change.
- Update this doc and [api-reference.md](./api-reference.md) when route
  contracts change.
