<!-- purpose-doc: normalized -->
# User Repository (`user.repository.js`)

## Scenario
The central repository for user accounts. Handles user registration, login lookups, email uniqueness checks, role/status filtering, and profile updates.

## What it does
Extends `BaseRepository` with `UserModel`. Uses `mergeFilters`. Likely methods:
- `findByEmail(email)` – finds one user by email (case‑insensitive).
- `findById(id)` – base method already provides, but may override to populate role.
- `createUser(data)` – creates a user (registration).
- `updateUser(id, data)` – updates profile fields.
- `findAll({ role, accountStatus, search, pagination })` – for admin user list.
- `updatePassword(id, passwordHash)` – updates password hash.

## Libraries used
- **mongoose**.
- `../models/user.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.

## Logic implemented
1. `findByEmail`: `this.findOne({ email: email.toLowerCase(), deletedAt: null })`.
2. `findAll`: builds filters with `mergeFilters({ role, accountStatus })`, and optionally a text search on `fullName` or `email`.
3. `createUser`: calls `this.create(data)`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
