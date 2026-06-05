<!-- purpose-doc: normalized -->
# Device Token Model (`device-token.model.js`)

## Scenario
For push notifications, the app registers the device token of each user’s mobile device. This model maps a user to their device token(s), allowing the server to send targeted notifications. It stores the token, the platform (iOS/Android), and when it was registered.

## What it does
Defines a schema with `userId`, `token`, `platform`, `createdAt`. Applies `standardDomainPlugin`. Exported as `DeviceTokenModel`.

## Libraries used
- **mongoose**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `userId`: ObjectId, ref: `'User'`, required.
   - `token`: String, required.
   - `platform`: enum `['ios', 'android']`.
   - `createdAt`: Date.
2. Unique index on `token` to avoid duplicates.
3. Index on `userId` for quick lookup of all tokens for a user.
4. Plugin adds tenant and soft‑delete.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
