<!-- purpose-doc: normalized -->
# Email Verification Token Utilities (`email-verification-token.js`)

## Scenario
When a user registers, the system sends an email containing a verification code (or link with a token). The code must be generated securely and stored in a way that protects against database leaks. This module provides two functions: one to generate a cryptographically random plain token, and another to hash that token (using SHA‑256 or similar) for safe storage in the user document. The plain token is sent to the user’s email; the hashed version is stored in the database.

## What it does
Exports two functions:

- **`generateEmailVerificationPlainToken()`** – uses `node:crypto` to produce a random string (e.g., 6‑digit code or a longer hex token) suitable for email verification. The length and character set may be configurable via `getEnv()` (e.g., `EMAIL_VERIFICATION_CODE_LENGTH`).
- **`hashEmailVerificationToken(plainToken)`** – takes the plain token and returns a hashed version (using `crypto.createHash('sha256').update(plainToken).digest('hex')`). This hash is stored in the user’s `verificationToken` field (or similar), so that if the database is compromised, the actual codes are not exposed.

## Libraries used
- **node:crypto** – for generating random bytes (`crypto.randomBytes` or `crypto.randomInt`) and for hashing (`crypto.createHash('sha256')`).
- **../config/env.js** – `getEnv()` for token configuration like length or TTL.

## Logic implemented
1. **`generateEmailVerificationPlainToken`**:
   - Reads desired length/format from environment or defaults (e.g., 6 digits for code, or 32 hex bytes for URL token).
   - Generates a random value: e.g., `crypto.randomInt(100000, 999999).toString()` for a numeric code, or `crypto.randomBytes(16).toString('hex')` for a long token.
   - Returns the plain string.
2. **`hashEmailVerificationToken`**:
   - Creates a SHA‑256 hash: `crypto.createHash('sha256').update(plainToken).digest('hex')`.
   - Returns the hash string.
3. In the auth service, the controller calls `generateEmailVerificationPlainToken()` to get the code, sends it via email, and stores `hashEmailVerificationToken(code)` in the user document alongside an expiry timestamp.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
