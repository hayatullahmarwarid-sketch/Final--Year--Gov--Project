<!-- purpose-doc: normalized -->
# Password Reset Token Utilities (`password-reset-token.js`)

## Scenario
When a user requests a password reset, the server generates a one‑time token, sends a link containing it to their email, and stores a hashed version of the token in the user record (or a separate collection) along with an expiry time. This module provides the cryptographic primitives for that process, ensuring reset tokens are unpredictable and stored securely. The same pattern as email verification tokens but may use longer, more entropic tokens since password reset URLs are typically in a link rather than a code typed manually.

## What it does
Exports two functions:

- **`generatePasswordResetPlainToken()`** – generates a cryptographically random token string (e.g., 40‑byte hex) that will be embedded in the reset URL.
- **`hashPasswordResetToken(plainToken)`** – hashes the plain token with SHA‑256 for secure storage in the database.

Both functions use configuration from `getEnv()` for token length or algorithm preferences.

## Libraries used
- **node:crypto** – `crypto.randomBytes` for the token, `crypto.createHash` for hashing.
- **../config/env.js** – `getEnv()` for token length or TTL settings.

## Logic implemented
1. **`generatePasswordResetPlainToken`**:
   - Reads token length from env (default 40 bytes → 80 hex chars).
   - Calls `crypto.randomBytes(length).toString('hex')`.
   - Returns the plain token.
2. **`hashPasswordResetToken`**:
   - `crypto.createHash('sha256').update(plainToken).digest('hex')`.
   - Returns the hash.
3. In the auth service, when a password reset is requested:
   - The plain token is generated.
   - The hashed token and an `expiresAt` are set on the user document.
   - A reset link is emailed to the user: `https://app.example/reset-password?token=PLAIN_TOKEN`.
4. When the user clicks the link and submits a new password, the server hashes the provided token and compares it to the stored hash; if they match and haven’t expired, the password is updated and the stored token is cleared.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
