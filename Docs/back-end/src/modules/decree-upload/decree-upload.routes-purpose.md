<!-- purpose-doc: normalized -->
# Decree Upload Routes (`decree-upload.routes.js`)

## Scenario

Authenticated department upload staff (`dept_upload`) or platform operators masquerading as them (`system_admin`) manage decree categories, decree records, publishing workflows, and departmental settings through REST endpoints consumed by the Expo `app/dept-upload/*` surfaces.

## What it does

Creates `decreeUploadRouter`, applies `authenticate()` plus `authorize(['dept_upload','system_admin'])` for every route, wires Zod validation via `validateRequest`, and delegates to `decreeUploadController` methods. All paths below are mounted under **`/api/v1/decree-upload`** (see [`back-end/src/routes/index.js`](../../../../../back-end/src/routes/index.js)).

| Area | HTTP paths |
| --- | --- |
| Bootstrap | `GET /_meta`, `GET /stats` |
| Settings | `GET /settings`, `PATCH /settings` |
| Categories | `GET /categories`, `GET /categories/:id`, `POST /categories`, `PATCH /categories/:id` |
| Decrees | `GET /decrees`, `POST /decrees`, `GET /decrees/next-number`, `GET /decrees/:id`, `PATCH /decrees/:id`, `POST /decrees/:id/publish`, `/archive`, `/supersede`, `/amendments`, `/draft/abandon` |
| Versions | `GET /decrees/:id/versions`, `GET /decrees/:id/versions/:versionId` |

## Libraries used

- **`Router`** (`express`) — Declares the HTTP surface for decree-upload module.
- **`validateRequest`** (`../shared/http/index.js`) — Applies Zod schemas from [`decree-upload.validation.js`](decree-upload.validation.js).
- **`authenticate`** (`../../middlewares/auth.middleware.js`) — Ensures JWT sessions exist before handlers run.
- **`authorize`** (`../../middlewares/authorize.middleware.js`) — Restricts access to `dept_upload` or `system_admin` principals.
- **`decreeUploadController`** (`./decree-upload.controller.js`) — Implements responses after validation.

## Logic implemented

1. Instantiate `Router`.
2. Apply global auth gate (`authenticate`, `authorize`).
3. Register meta/stats/settings routes first so lightweight probes succeed without touching decree entities.
4. Register categories routes with list/detail/create/patch semantics.
5. Register decree collection routes (`GET/POST /decrees`) plus helper `GET /decrees/next-number`.
6. Register decree instance routes under `/decrees/:id` for CRUD plus lifecycle transitions (`publish`, `archive`, `supersede`, `amendments`, `draft/abandon`).
7. Register read-only version listing endpoints for audit/history views.
8. Export `decreeUploadRouter` for mounting in the versioned API root.

## Roles

- **public** — None (router rejects without staff roles).
- **inspector** — None.
- **inspector_admin** — None on this router (separate module).
- **decree_upload_department** — Direct (JWT role key `dept_upload`).
- **system_admin** — Direct (operators may manage uploads).
