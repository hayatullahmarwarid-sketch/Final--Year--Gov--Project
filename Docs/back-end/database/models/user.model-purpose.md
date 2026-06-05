<!-- purpose-doc: normalized -->
# User Model (`user.model.js`)

## Scenario
The central model for all user accounts—public users, inspectors, department officers, and admins. It stores authentication data (email, password hash), profile information (name, avatar), account status (active, suspended, unverified), and role. All login, registration, profile updates, and admin user management rely on this model.

## What it does
Schema with `email`, `passwordHash`, `fullName`, `role` (enum from `ROLE_KEYS`), `accountStatus` (enum from `USER_ACCOUNT_STATUS_KEYS`), `avatarFileId`, `preferredLanguage`, `provinceId`, `districtId`, and timestamps. Applies `standardDomainPlugin`. Exported as `UserModel`.

## Libraries used
- **mongoose**.
- **../../src/modules/shared/enums/roles.js**.
- **../../src/modules/shared/enums/user-account-status.js**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `email`: String, required, unique, lowercase.
   - `passwordHash`: String (hashed).
   - `fullName`: String.
   - `role`: enum from roles.
   - `accountStatus`: enum, default `'UNVERIFIED'`.
   - `avatarFileId`: ObjectId, ref: `'StoredFile'`.
   - `preferredLanguage`: String.
   - `provinceId`, `districtId`: Strings or ObjectIds.
2. Unique index on `email`.
3. Index on `role + accountStatus` for admin user listings.
4. Plugin adds tenant and soft‑delete (user is tenant‑scoped for multi‑tenancy).
5. Static methods or hooks for password hashing (not shown but typical).

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
