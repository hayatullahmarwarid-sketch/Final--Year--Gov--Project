<!-- purpose-doc: normalized -->
# Refresh Token Model (`refresh-token.model.js`)

## Scenario
For secure authentication, the server issues short‑lived access tokens and longer‑lived refresh tokens. This model stores the refresh tokens, associated user, expiration date, and revocation status. It allows the server to issue new access tokens without re‑authenticating the user, and to revoke tokens for logout or security incidents.

## What it does
Schema with `userId`, `token` (hashed), `expiresAt`, `revoked` (Boolean), `issuedAt`. No plugins imported. Exported as `RefreshTokenModel`.

## Libraries used
- **mongoose**.

## Logic implemented
1. Fields:
   - `userId`: ObjectId, ref: `'User'`.
   - `token`: String (hashed).
   - `expiresAt`: Date.
   - `revoked`: Boolean, default false.
   - `issuedAt`: Date.
2. Index on `token` (possibly hashed) for fast lookup and revocation checks.
3. Compound index on `userId + revoked` to find active tokens for a user.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
