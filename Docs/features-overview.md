# Features overview

This document lists **every shipped capability** traced through the Expo client (`app/`, `lib/`), the Express API (`back-end/src`), MongoDB collections (via repositories/models), background workers, cron ticks, migrations, and operational scripts. Paths are **evidence-based** from the repository; nothing here should be treated as a marketing requirement list.

**Client API helpers** live under [`lib/api/`](lib/api/) and map to `/api/v1/...` routes mounted in [`back-end/src/routes/index.js`](back-end/src/routes/index.js).

---

## Index

1. [Ground rules](#ground-rules)
2. [HTTP shell and global middleware](#http-shell-and-global-middleware)
3. [Authentication and session](#authentication-and-session)
4. [`/api/v1/auth` — registration, login, tokens, profile](#apiv1auth--registration-login-tokens-profile)
5. [`/api/v1/uploads` — multipart binary upload](#apiv1uploads--multipart-binary-upload)
6. [`/api/v1/notifications` — inbox and badge](#apiv1notifications--inbox-and-badge)
7. [`/api/v1/super-admin`](#apiv1super-admin)
8. [`/api/v1/system-admin`](#apiv1system-admin)
9. [`/api/v1/decree-upload` — department workspace](#apiv1decree-upload--department-workspace)
10. [`/api/v1/inspector-admin`](#apiv1inspector-admin)
11. [`/api/v1/inspectors` — field inspector](#apiv1inspectors--field-inspector)
12. [`/api/v1/public` — public catalogue and signed-in public persona](#apiv1public--public-catalogue-and-signed-in-public-persona)
13. [`/api/v1/content` — static pages and homepage banners](#apiv1content--static-pages-and-homepage-banners)
14. [`/api/v1/files` — stored file metadata and signed URLs](#apiv1files--stored-file-metadata-and-signed-urls)
15. [`/api/v1/dashboards` — role dashboards and snapshots](#apiv1dashboards--role-dashboards-and-snapshots)
16. [`/api/v1/devices` — push device tokens](#apiv1devices--push-device-tokens)
17. [`/api/v1/certificates` — public verification (no auth)](#apiv1certificates--public-verification-no-auth)
18. [`/api/v1/search` — unified authenticated search](#apiv1search--unified-authenticated-search)
19. [`/health` and `/metrics`](#health-and-metrics)
20. [Worker process, BullMQ queues, in-process fallback](#worker-process-bullmq-queues-in-process-fallback)
21. [Cron schedules (worker)](#cron-schedules-worker)
22. [Database migrations](#database-migrations)
23. [Database seeders](#database-seeders)
24. [Back-end operational scripts](#back-end-operational-scripts)
25. [Repository maintenance scripts (`scripts/*.mjs`)](#repository-maintenance-scripts-scriptsmjs)
26. [Expo app routes — screen inventory](#expo-app-routes--screen-inventory)
27. [Reserved but unused job queue names](#reserved-but-unused-job-queue-names)

---

## Ground rules

- **Version prefix**: All product JSON APIs use **`/api/v1`** unless noted ([`routes/index.js`](back-end/src/routes/index.js)).
- **Roles** in `authorize([...])` use backend role keys such as `public`, `inspector`, `dept_upload`, `inspector_admin`, `system_admin` (see [`roles.js`](back-end/src/modules/shared/enums/roles.js)).
- **Do not assume** queue names in [`queue-names.js`](back-end/src/jobs/queue-names.js) are implemented unless a handler or enqueue exists ([reserved list](#reserved-but-unused-job-queue-names)).

---

## HTTP shell and global middleware

**Evidence**: [`back-end/src/app.js`](back-end/src/app.js), [`back-end/src/routes/index.js`](back-end/src/routes/index.js).

| Concern | What happens (chronological) | Main files |
| --- | --- | --- |
| Static files | `GET /uploads/*` serves files from disk relative to `UPLOAD_DIR`, with tight CSP and no directory indexes. | [`app.js`](back-end/src/app.js) |
| Request identity | `requestContextMiddleware` assigns `requestId` and context for logging. | [`request-context.middleware.js`](back-end/src/middlewares/request-context.middleware.js) |
| Dev headers | In production, requests with `x-public-user-id` / `x-inspector-user-id` / `x-staff-user-id` are rejected when `DISABLE_DEV_AUTH_HEADERS` is set. | [`app.js`](back-end/src/app.js) |
| JWT (optional) | `resolveBearerJwtMiddleware` parses `Authorization: Bearer` when present; routes decide if auth is required. | [`auth.middleware.js`](back-end/src/middlewares/auth.middleware.js) |
| i18n | `i18nMiddleware` sets locale on the request for translated API messages. | [`modules/shared/i18n/`](back-end/src/modules/shared/i18n/) |
| Rate limit | `globalApiLimiter()` applies before routers. | [`rate-limit.middleware.js`](back-end/src/middlewares/rate-limit.middleware.js) |
| Metrics | HTTP metrics recorded for Prometheus scrape flow. | [`metrics.middleware.js`](back-end/src/middlewares/metrics.middleware.js) |
| Audit | Non-GET writes can be logged for compliance. | [`audit-http-writes.middleware.js`](back-end/src/middlewares/audit-http-writes.middleware.js) |
| Errors | Central JSON error envelope after routers. | [`error-handler.middleware.js`](back-end/src/middlewares/error-handler.middleware.js) |

**Front-end**: the mobile app does not configure this stack; it only consumes `/api/v1/*`, `/health`, and static `/uploads` URLs returned by the API.

---

## Authentication and session

### Issuing and refreshing tokens

**API** ([`auth.routes.js`](back-end/src/api/v1/auth/auth.routes.js), [`auth.controller.js`](back-end/src/api/v1/auth/auth.controller.js), [`auth.service.js`](back-end/src/api/v1/auth/auth.service.js)):

1. `POST /api/v1/auth/register` — `registerLimiter`, `registerBodySchema`, creates a `users` document (hashed password, email verification token), often returns tokens; may enqueue email send jobs.
2. `POST /api/v1/auth/login` — `loginLimiter`, returns access + refresh JWT pair; reads/writes `refresh_tokens` collection.
3. `POST /api/v1/auth/refresh` — `refreshLimiter`, rotates refresh token and returns new pair.
4. `POST /api/v1/auth/logout` / `logout-all` — revokes refresh token(s).
5. `GET/PATCH /api/v1/auth/me` — `authenticate()`, current user profile patch.

**Email verification** — `POST .../email-verification/send`, `POST .../email-verification/confirm`.

**Password reset** — `POST .../password-reset/request`, `POST .../password-reset/complete` (aliases `forgot-password` / `reset-password` for client compatibility).

**Mobile** ([`lib/api/auth-public-flow.ts`](lib/api/auth-public-flow.ts), [`lib/api/auth.ts`](lib/api/auth.ts), [`lib/api/jwt-session-storage.ts`](lib/api/jwt-session-storage.ts), [`lib/api/fetch-with-jwt-refresh.ts`](lib/api/fetch-with-jwt-refresh.ts)):

- Registration and login screens store JWTs in secure storage and attach `Authorization` on subsequent calls.
- When an access token expires, `fetch-with-jwt-refresh` calls refresh, updates storage, and retries once.

**Screens**: [`app/register.tsx`](app/register.tsx), [`app/login.tsx`](app/login.tsx), [`app/verify-email.tsx`](app/verify-email.tsx), [`app/forgot-password/*`](app/forgot-password/), [`app/change-password.tsx`](app/change-password.tsx), [`app/change-account-email.tsx`](app/change-account-email.tsx).

---

## `/api/v1/auth` — registration, login, tokens, profile

See [Authentication and session](#authentication-and-session). Validation schemas: [`auth.validation.js`](back-end/src/api/v1/auth/auth.validation.js).

---

## `/api/v1/uploads` — multipart binary upload

**Evidence**: [`uploads.routes.js`](back-end/src/api/v1/uploads/uploads.routes.js), [`persistUpload`](back-end/src/services/storage/upload.service.js).

| Step | Detail |
| --- | --- |
| Client | Multipart field `file`; optional query `purpose`, `folder` (see `STORED_FILE_PURPOSE_KEYS`). |
| Middleware | `authenticate()`, `authorize` for roles `public`, `inspector`, `dept_upload`, `inspector_admin`, `system_admin`; multer memory storage limited by `MAX_UPLOAD_BYTES`. |
| Persistence | Writes binary via storage provider; inserts/updates `stored_files`; may deduplicate by hash. |
| Audit | `auditService.logFromRequest(..., 'file.upload', ...)`. |
| Response | `{ fileId, storageKey, provider, url?, ... }`; private object storage may return `url: null` and require [`GET /api/v1/files/:id/url`](#apiv1files--stored-file-metadata-and-signed-urls). |

**Mobile helper**: [`lib/api/uploads.ts`](lib/api/uploads.ts).

---

## `/api/v1/notifications` — inbox and badge

**Evidence**: [`notifications.routes.js`](back-end/src/modules/notifications/notifications.routes.js), [`notification-recipient.middleware.js`](back-end/src/modules/notifications/middleware/notification-recipient.middleware.js).

The router runs **`notificationRecipientMiddleware`** first: it resolves `ownerUserId` from public JWT / legacy headers / staff JWT `req.user.id`, so both mobile public users and staff roles can share the notification inbox shape.

| Method | Path | Behaviour |
| --- | --- | --- |
| GET | `/badge-count` | Unread badge integer. |
| POST | `/read-all` | Mark all read for recipient. |
| GET | `/` | Paginated list (validated query). |
| POST | `/` | Create notification (admin/system flows). |
| POST | `/:id/read` | Mark one read. |
| DELETE | `/:id` | Remove one. |

**Collections**: `notifications`, `notification_user_states` (see models under [`database/models/`](back-end/database/models/)).

**Mobile**: [`lib/api/notifications.ts`](lib/api/notifications.ts), contexts [`notification-inbox-context`](contexts/), screens [`app/notifications.tsx`](app/notifications.tsx), [`app/notification-settings.tsx`](app/notification-settings.tsx).

---

## `/api/v1/super-admin`

**Evidence**: [`super-admin.routes.js`](back-end/src/modules/super-admin/super-admin.routes.js).

| Method | Path | Controller |
| --- | --- | --- |
| GET | `/_meta` | `meta` — requires `authenticate()` + `authorize(['system_admin'])`. |

Narrow surface: metadata only.

---

## `/api/v1/system-admin`

**Evidence**: [`system-admin.routes.js`](back-end/src/modules/system-admin/system-admin.routes.js). Router-level `authenticate()` + `authorize(['system_admin'])`.

Capabilities (each maps to `systemAdminController`):

- **Dashboards**: `GET /dashboard`, `GET /system-summary`.
- **Users**: `GET /platform-users`, staff CRUD under `/staff`, `GET /staff/:id/portal-password`.
- **Settings**: `GET/PATCH /settings` (`system_platform_settings`).
- **Audit**: `GET /audit-logs` → [`audit_logs`](back-end/database/models/audit-log.model.js).
- **Notifications**: list, mark read, mark all read.
- **Operations**: `POST /backup`, `POST /announce` (system-wide messaging).

**Mobile / web client**: [`lib/api/system-admin.ts`](lib/api/system-admin.ts); screens under [`app/system-admin/`](app/system-admin/).

---

## `/api/v1/decree-upload` — department workspace

**Evidence**: [`decree-upload.routes.js`](back-end/src/modules/decree-upload/decree-upload.routes.js). `authenticate()` + `authorize(['dept_upload', 'system_admin'])`.

**Surfaces**:

- **Meta & workspace**: `GET /_meta`, `GET /stats`.
- **Department settings**: `GET/PATCH /settings` → [`dept_upload_settings`](back-end/database/models/dept-upload-settings.model.js).
- **Categories**: full CRUD list/get/create/patch on `/categories`.
- **Decrees**: list, create, `GET /decrees/next-number`, get/patch single, publish, archive, supersede, amendments, abandon draft, version history.

**Persistence**: `decrees`, `decree_versions`, `decree_categories`, related repositories.

**Mobile client**: [`lib/api/decree-upload.ts`](lib/api/decree-upload.ts), [`lib/dept-upload/*`](lib/dept-upload/), screens [`app/dept-upload/*`](app/dept-upload/).

---

## `/api/v1/inspector-admin`

**Evidence**: [`inspector-admin.routes.js`](back-end/src/modules/inspector-admin/inspector-admin.routes.js).

- **`GET /_meta`** is registered **before** `authenticate()` — unauthenticated metadata for the admin app shell.
- All other routes: `authenticate()` + `authorize(['inspector_admin'])`.

**Major groups**:

| Area | Paths (relative to `/api/v1/inspector-admin`) |
| --- | --- |
| Templates / forms | `/templates/*` and alias `/forms/*` (same handlers) |
| Assignments | `/assignments`, `/assignments/:id` |
| Submissions | `/submissions`, return/finalize workflows |
| Question bank | `/question-bank` CRUD |
| Exams | `/exams`, exam questions, clone from bank |
| Certificates | list + `POST /certificates/:id/revoke` |
| Exam grading | `/exam-attempts` list + grade endpoints |
| Inspectors | list + patch |
| Reports | operational CSV, implementation map, inspector performance, tracking zones, PDF export |
| Dashboard | `GET /dashboard` |

**Client**: [`lib/api/inspector-admin.ts`](lib/api/inspector-admin.ts); screens [`app/inspector-admin/*`](app/inspector-admin/).

---

## `/api/v1/inspectors` — field inspector

**Evidence**: [`inspectors.routes.js`](back-end/src/modules/inspectors/inspectors.routes.js).

1. `GET /_meta` — before auth block.
2. `authenticate()` + `authorize(['inspector','inspector_admin','system_admin'])`.
3. **`requireInspectorUserMiddleware`** on inspector-specific routes so the JWT maps to an inspector profile.

**Capabilities**:

| Path | Purpose |
| --- | --- |
| `/dashboard` | Inspector home metrics |
| `/assignments`, `/assignments/:id` | Assigned inspections |
| `/assignments/:id/save-draft`, `/submit` | Draft + final submission |
| `/assignments/:id/evidence` | Attach evidence file references |
| `/inspections/offline`, `/inspections/offline/sync` | Offline capture import |
| `/sync-status`, **`POST /sync`** | Batch sync for field teams |

**Collections**: `inspection_assignments`, `inspection_submissions`, `inspection_evidence_files`, `pending_inspection_offline` (see models).

**Client**: [`lib/api/inspectors.ts`](lib/api/inspectors.ts); screens [`app/inspector/*`](app/inspector/).

---

## `/api/v1/public` — public catalogue and signed-in public persona

**Evidence**: [`public-users.routes.js`](back-end/src/modules/public-users/public-users.routes.js), [`public-user-context.middleware.js`](back-end/src/modules/public-users/middleware/public-user-context.middleware.js).

Router applies **`publicUserContextMiddleware`** so optional JWT attaches `ownerUserId` for bookmarks, exams, etc.

| Group | Endpoints |
| --- | --- |
| Bootstrap | `GET /_meta`, `GET /home` |
| Catalogue | `GET /decrees`, `GET /decree-categories`, `GET /decrees/:id` |
| Engagement | **`POST /decrees/:id/view`** — after ~30s dwell, mobile calls this; [`decreeViewRepository.recordEngagementView`](back-end/database/repositories/decree-view.repository.js) inserts `decree_views` and increments `decree.viewCount`. |
| PDF | `GET /decrees/:id/pdf` |
| Bookmarks | `GET/POST /bookmarks`, `DELETE /bookmarks/:id` → `decree_bookmarks` |
| Notifications | `GET /notifications` |
| Exams | `GET /exams`, `GET /exams/:id`, exam attempts create/submit/patch/get, `GET /results` |
| Certificates | `GET /certificates`, `GET /certificates/:id` |
| Profile | `GET /profile` |

**Mobile**: [`lib/api/public-user.ts`](lib/api/public-user.ts), [`lib/api/public-catalog.ts`](lib/api/public-catalog.ts) (shared types/helpers); tabs [`app/(tabs)/*`](app/(tabs)/), decree reader [`app/decree/[id].tsx`](app/decree/[id].tsx), hooks [`hooks/use-decree-engagement-view.ts`](hooks/use-decree-engagement-view.ts).

---

## `/api/v1/content` — static pages and homepage banners

**Evidence**: [`content.routes.js`](back-end/src/modules/content/content.routes.js), [`content.service.js`](back-end/src/modules/content/content.service.js).

**Note**: These routes do **not** mount `authenticate()` at router level — callers rely on operational secrecy + validation; **`publishedOnly`** queries restrict public reads.

| Path | Role |
| --- | --- |
| `GET /catalog-status` | Module heartbeat |
| `/pages` CRUD | Static legal/info pages → `static_content_pages` |
| `/banners` CRUD | Homepage carousel → `homepage_banners` |

**Mobile**: content pieces consumed via `GET /public/home` payloads and dedicated fetches where implemented (see public catalogue).

---

## `/api/v1/files` — stored file metadata and signed URLs

**Evidence**: [`files.routes.js`](back-end/src/modules/files/files.routes.js).

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/limits` | Upload caps for UI. |
| POST | `/` | Register metadata (`createMetadata`) — used when upload flow creates DB row without multipart upload route. |
| GET | `/`, `/:id` | List/get metadata. |
| GET | `/:id/url` | Signed/public URL resolution via storage provider. |
| DELETE | `/:id` | Soft/hard delete per service rules. |

**Mobile**: [`lib/api/files.ts`](lib/api/files.ts).

---

## `/api/v1/dashboards` — role dashboards and snapshots

**Evidence**: [`dashboards.routes.js`](back-end/src/modules/dashboards/dashboards.routes.js), [`dashboards.service.js`](back-end/src/modules/dashboards/dashboards.service.js).

| Path | Auth | Purpose |
| --- | --- | --- |
| `/summary` | Mixed | Lightweight shared summary |
| `/system-admin` | `system_admin` | Admin KPIs |
| `/decree-upload` | `dept_upload` + `system_admin` | Uploader metrics |
| `/inspector-admin` | `inspector_admin` | Staff KPIs |
| `/inspector` | inspector roles | Field dashboard |
| `/public` | `public` + `publicUserContextMiddleware` | Signed-in citizen snapshot |

Snapshot documents live in `dashboard_metrics_snapshots` (see [`dashboard-metrics-snapshot.model.js`](back-end/database/models/dashboard-metrics-snapshot.model.js)); worker refreshes shared slices periodically ([Worker](#worker-process-bullmq-queues-in-process-fallback)).

---

## `/api/v1/devices` — push device tokens

**Evidence**: [`devices.routes.js`](back-end/src/modules/devices/devices.routes.js) — `authenticate()` on all routes.

| Method | Path | Behaviour |
| --- | --- | --- |
| GET | `/` | List registered devices for user |
| POST | `/` | Register Expo push token (`device_tokens`) |
| DELETE | `/:id` | Unregister |

Push fan-out jobs read these rows ([`notifications-fanout.handler.js`](back-end/src/jobs/handlers/notifications-fanout.handler.js)).

**Mobile**: [`lib/api/devices.ts`](lib/api/devices.ts).

---

## `/api/v1/certificates` — public verification (no auth)

**Evidence**: [`certificates-public.routes.js`](back-end/src/modules/certificates/certificates-public.routes.js).

| Path | Behaviour |
| --- | --- |
| `GET /verify/:certificateRef` | Lookup by Mongo id or human-readable `certificateNumber`; returns `{ valid, certificateData? }`. |
| `GET /verify?token=...` | Signed-token verification; compares embedded `issuedAtMs` with DB row. |

**Mobile**: [`lib/api/certificates-public.ts`](lib/api/certificates-public.ts), screen [`app/verify-certificate.tsx`](app/verify-certificate.tsx).

---

## `/api/v1/search` — unified authenticated search

**Evidence**: [`search.routes.js`](back-end/src/modules/search/search.routes.js) — `authenticate()` then `GET /?query=...` via [`search.controller.js`](back-end/src/modules/search/search.controller.js).

**Mobile**: [`lib/api/search.ts`](lib/api/search.ts), screen [`app/search.tsx`](app/search.tsx).

---

## `/health` and `/metrics`

| Path | Purpose |
| --- | --- |
| `GET /health` | Liveness — always returns 200 if process serves HTTP. |
| `GET /health/ready` | Readiness — Mongo required; Redis must be ready if configured; SMTP reported as configured/disabled. |
| `GET /metrics` | Prometheus text when `METRICS_TOKEN` set; Bearer token gate ([`metrics.routes.js`](back-end/src/routes/metrics.routes.js)). |

**Mobile**: [`lib/api/health.ts`](lib/api/health.ts) for pre-login checks on auth screens.

---

## Worker process, BullMQ queues, in-process fallback

**Evidence**: [`back-end/src/worker.js`](back-end/src/worker.js), [`register-in-process-handlers.js`](back-end/src/jobs/register-in-process-handlers.js), [`queue-registry.js`](back-end/src/jobs/queue-registry.js).

### Registered handlers (production worker)

| Queue (`QUEUE.*`) | Handler file | What it does |
| --- | --- | --- |
| `email.send` | [`email-send.handler.js`](back-end/src/jobs/handlers/email-send.handler.js) | Sends SMTP mail from job payload. |
| `dashboards.snapshot` | [`dashboards-snapshot.handler.js`](back-end/src/jobs/handlers/dashboards-snapshot.handler.js) | Recomputes cached dashboard metrics for `system_admin` and `inspector_admin` roles (logs skip for personalized dept dashboards). |
| `notifications.fanout` | [`notifications-fanout.handler.js`](back-end/src/jobs/handlers/notifications-fanout.handler.js) | Expo push to all active device tokens for recipient user ids. |
| `certificates.issue` | [`certificate-issue.handler.js`](back-end/src/jobs/handlers/certificate-issue.handler.js) | Runs [`certificateIssueWorkflow.renderAndAttachPdf`](back-end/src/modules/certificates/certificate-issue.workflow.js). |

### Boot enqueue

Worker calls `enqueue(QUEUE.DASHBOARDS_SNAPSHOT, 'refresh-shared', { roles: [...] }, { jobId: 'dashboards.snapshot.boot' })` once so repeatable snapshots exist after deploy.

### Dev / no Redis

API process registers **in-process** workers for email, notifications, certificates only when Redis is absent ([`registerInProcessHandlersIfNeeded`](back-end/src/jobs/register-in-process-handlers.js)).

---

## Cron schedules (worker)

**Evidence**: [`worker.js`](back-end/src/worker.js), [`assignment-deadline-reminders.js`](back-end/src/jobs/cron/assignment-deadline-reminders.js), [`audit-log-prune.js`](back-end/src/jobs/cron/audit-log-prune.js).

Requires `WORKER_CRON_ENABLED=true` (see [`env.js`](back-end/src/config/env.js)).

| Schedule (UTC) | Function | Behaviour |
| --- | --- | --- |
| `5 * * * *` | `runAssignmentDeadlineReminderTick` | Finds assignments due in ~24h, inserts `NotificationModel` rows for inspectors, sets `deadlineReminderSent`. |
| `20 4 * * *` | `runAuditLogPruneTick` | Deletes old `audit_logs` past retention (`AUDIT_LOG_RETENTION_DAYS`). |

---

## Database migrations

**Evidence**: [`back-end/database/migrations/*.mjs`](back-end/database/migrations/).

| File | Purpose |
| --- | --- |
| `0001_initial_indexes.mjs` | Imports all core models and runs `syncIndexes` once for baseline indexes. |
| `0002_decrees_engagement.mjs` | Engagement-related index adjustments (per migration body). |
| `0003_inspection_deadline_reminder.mjs` | Inspection reminder fields/indexes. |
| `0004_decrees_text_index.mjs` | Text search index for decree content. |
| `0005_decree_views_engagement_many_per_user.mjs` | Supports multiple engagement-qualified views per user/decree pair. |

Runner: [`run.js`](back-end/database/migrations/run.js).

---

## Database seeders

**Evidence**: [`back-end/database/seeders/role.seeder.js`](back-end/database/seeders/role.seeder.js), [`run-seed.js`](back-end/database/seeders/run-seed.js).

- Seeds canonical **roles** (`public_user`, `inspector`, `system_admin`, `decree_upload_department`, `inspector_admin`) with default permission placeholders from [`rbac-placeholders.js`](back-end/src/core/security/rbac-placeholders.js).

---

## Back-end operational scripts

**Evidence**: [`back-end/scripts/`](back-end/scripts/).

| Script | Purpose |
| --- | --- |
| [`prune-audit-logs.js`](back-end/scripts/prune-audit-logs.js) | Deletes aged `audit_logs` rows (CLI retention days env, default 90 in script header). |
| [`seed-roles.js`](back-end/scripts/seed-roles.js) | Invokes role seeder standalone. |
| [`prune-users-for-fresh-start.js`](back-end/scripts/prune-users-for-fresh-start.js) | Destructive reset helper for dev environments (see file header before running). |

---

## Repository maintenance scripts (`scripts/*.mjs`)

These live at repo root [`scripts/`](scripts/). They are **developer tooling**, not end-user features:

| Script | Role |
| --- | --- |
| [`normalize-purpose-docs.mjs`](scripts/normalize-purpose-docs.mjs) | Rewrites `Docs/**/*-purpose.md` into narrative sections from source imports. |
| [`inventory-purpose-docs.mjs`](scripts/inventory-purpose-docs.mjs) | Counts template vs narrative purpose docs. |
| [`generate-architecture-docs.mjs`](scripts/generate-architecture-docs.mjs) | Generates architecture artifacts (skips normalized docs). |
| [`generate-common-locales.mjs`](scripts/generate-common-locales.mjs) | Locale generation for i18n. |
| [`i18n-ui-extra.mjs`](scripts/i18n-ui-extra.mjs), [`i18n-ui-more.mjs`](scripts/i18n-ui-more.mjs) | i18n UI helpers. |
| [`start-expo-for-phone.mjs`](scripts/start-expo-for-phone.mjs) | Dev convenience for Expo. |
| [`strip-web-platform-branches.mjs`](scripts/strip-web-platform-branches.mjs), [`strip-web-haptic-guards.mjs`](scripts/strip-web-haptic-guards.mjs) | Code hygiene for RN vs web. |
| [`reset-project.js`](scripts/reset-project.js) | Dangerous dev reset — read before use. |

---

## Expo app routes — screen inventory

**Evidence**: [`app/_layout.tsx`](app/_layout.tsx) Stack registration + filesystem routes.

Global providers wrap the tree: language, auth session, notifications inbox/settings, user profile, public user data, i18n, bootstrap.

| Route group | Files | Primary API modules |
| --- | --- | --- |
| Onboarding / auth | `index`, `language`, `register`, `login`, `verify-email`, `inspector-login`, `forgot-password/*` | `auth-public-flow`, `auth`, `health` |
| Public tabs | `(tabs)/index`, `decrees`, `exams`, `certificates`, `profile` | `public-user`, `public-catalog` |
| Account | `edit-profile`, `change-account-email`, `change-password`, `settings-language` | `auth`, `public-user` |
| Notifications | `notifications`, `notification-settings` | `notifications` |
| Content | `search`, `decree/[id]`, `bookmarked-decrees` | `public-user`, search |
| Exams | `exam/[id]/*` | `public-user` |
| Certificates | `certificate/[id]`, `verify-certificate` | `public-user`, `certificates-public` |
| Dept upload | `dept-upload/*` | `decree-upload`, `uploads`, `files` |
| Inspector field | `inspector/*` | `inspectors` |
| Inspector admin | `inspector-admin/*` | `inspector-admin` |
| System admin | `system-admin/*` | `system-admin` |

---

## Reserved but unused job queue names

[`queue-names.js`](back-end/src/jobs/queue-names.js) defines `QUEUE.FILES_GC` and `QUEUE.AUDIT_INTEGRITY_CHECK`. **No handler or enqueue** appears in the worker bootstrap — treat as **reserved identifiers only**, not shipped features, until code references appear.

---

## Related documentation

- Per-file narratives: `Docs/**/*-purpose.md`
- Authoring standard for those files: [`purpose-doc-authoring-guide.md`](purpose-doc-authoring-guide.md)
