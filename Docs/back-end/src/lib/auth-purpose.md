<!-- purpose-doc: normalized -->
# Authentication Utilities (`auth.js`)

## Scenario
Every secure back‑end needs to handle passwords safely (hash on registration, compare on login), issue and verify JSON Web Tokens for API access, and manage refresh tokens so users can obtain new access tokens without re‑entering credentials. These operations are spread across the auth service and middleware; centralising them in a single `auth.js` module ensures consistent algorithms, secret keys, and token lifecycle policies.

## What it does
Exports a collection of functions that form the complete authentication toolkit:

- **`hashPassword(plain)`** – salts and hashes a plain‑text password using `bcryptjs` (with a cost factor from environment config).
- **`comparePassword(plain, hash)`** – safely compares a plain‑text password against a stored bcrypt hash.
- **`generateToken(payload, expiresIn)`** – creates a signed JWT (access token) with a given payload and expiry duration, using the secret from `getEnv()`.
- **`verifyToken(token)`** – verifies and decodes a JWT, returning the payload if valid, or throwing if expired/invalid.
- **`issueRefreshToken(userId, deviceInfo, options)`** – (likely newer alias) creates a cryptographically random refresh token, stores a hashed version in `RefreshTokenModel` with associated user, device info, and expiry, and returns the plain token to the client.
- **`generateRefreshToken(userId, deviceInfo)`** – (older or simpler version) similar, generates a refresh token and persists its hash.
- **`verifyRefreshToken(plainToken)`** – looks up the hashed token in `RefreshTokenModel`, checks it is not revoked or expired; returns the token document if valid.
- **`revokeRefreshToken(tokenId, options)`** – revokes a refresh token by its database ID (sets `revoked: true`).
- **`revokeRefreshTokenByPlain(plainToken)`** – hashes the plain token and revokes any matching record.
- **`revokeAllUserTokens(userId)`** – revokes all refresh tokens for a given user (e.g., on password change or logout of all devices).

The module uses `getEnv` for `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, and bcrypt salt rounds. It uses `getLogger` for auditing token issues/revocations.

## Libraries used
- **bcryptjs** – password hashing and comparison.
- **jsonwebtoken** – JWT signing and verification.
- **mongoose** – implicitly via `UserModel` and `RefreshTokenModel` (the models are used directly, though they are Mongoose models; `mongoose` itself is listed as a dependency for access to `Types.ObjectId` etc.).
- **node:crypto** – `crypto.randomBytes` for generating secure refresh token strings.
- **../config/env.js** – `getEnv()` for secrets and expiry durations.
- **../config/logger.js** – `getLogger()` for logging token lifecycle events.
- **../../database/models/user.model.js** – `UserModel` (aliased as `User`) for updating password fields.
- **../../database/models/refresh-token.model.js** – `RefreshTokenModel` for storing refresh token records.

## Logic implemented
1. **`hashPassword`**: generates a salt with `bcrypt.genSalt(rounds)` and returns `bcrypt.hash(plain, salt)`.
2. **`comparePassword`**: `bcrypt.compare(plain, hash)`.
3. **`generateToken`**: calls `jwt.sign(payload, secret, { expiresIn })`.
4. **`verifyToken`**: calls `jwt.verify(token, secret)`.
5. **`issueRefreshToken` / `generateRefreshToken`**:
   - Generates a random 48‑byte hex string via `crypto.randomBytes(48).toString('hex')`.
   - Hashes the plain token using a fast hashing algorithm (e.g., SHA‑256) to store only the hash.
   - Creates a `RefreshTokenModel` document with the hash, userId, device info, and `expiresAt` = now + REFRESH_TOKEN_EXPIRES_IN.
   - Returns the plain token (to send to the client).
6. **`verifyRefreshToken`**:
   - Hashes the incoming plain token.
   - Searches `RefreshTokenModel` for a non‑revoked, non‑expired document with that hash.
   - If found, returns it; otherwise throws an `UnauthorizedError`.
7. **`revokeRefreshTokenByPlain`**: hashes the plain token, then updates the document to set `revoked: true`.
8. **`revokeAllUserTokens`**: calls `RefreshTokenModel.updateMany({ userId, revoked: false }, { revoked: true })`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
