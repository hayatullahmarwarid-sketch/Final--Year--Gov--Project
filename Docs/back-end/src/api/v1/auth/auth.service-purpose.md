<!-- purpose-doc: normalized -->
# Auth Service (`auth.service.js`)

## Scenario
The core business logic for authentication lives here—hashing passwords, generating and verifying JWTs, rotating refresh tokens, handling email verification codes, password reset tokens, and ensuring that all operations comply with security policies (strong passwords, token expiry, role‑based access). The service coordinates between the User model, the user repository, and environment configuration.

## What it does
The `AuthService` class encapsulates all authentication logic. It has access to:

- `UserModel` (for raw database access, e.g., updating password hashes).
- `userRepository` (for data‑access abstraction).
- `getEnv` (for secrets like `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `EMAIL_VERIFICATION_CODE_TTL`, etc.).
- `getLogger` (for logging errors and important events).
- `RoleKey` (to default new users to the `PUBLIC` role on registration).
- `HttpStatus` (to throw appropriate HTTP errors).

Key methods (inferred from a typical auth service and the usage in the controller):

- `register(data)` – validates email uniqueness via `userRepository.findByEmail`, hashes password using `crypto`, creates user with status `UNVERIFIED`, generates a verification code, sends it (via email service), returns user data and token pair.
- `login(email, password)` – finds user by email, compares password hash, checks account status, creates audit log, generates access and refresh tokens, returns them.
- `refreshToken(refreshToken)` – verifies the refresh token (likely a JWT or opaque token stored in `RefreshTokenModel`), checks revocation and expiry, generates a new token pair and revokes the old refresh token.
- `logout(userId, refreshToken)` – revokes the provided refresh token.
- `sendEmailVerification(email)` – generates a random code, stores it (maybe in a temporary collection or hashed in the user doc), sends email.
- `confirmEmailVerification(email, code)` – validates the code, activates user account (`accountStatus = ACTIVE`), clears the code, returns tokens.
- `changePassword(userId, oldPassword, newPassword)` – verifies old password, validates new password strength, hashes new password, updates user.
- `changeEmail(userId, newEmail, password)` – verifies password, checks new email uniqueness, updates email (and possibly sends re‑verification).
- `requestPasswordReset(email)` – finds user, generates reset token (time‑limited, stored or hashed), sends email with link containing token.
- `completePasswordReset(token, newPassword)` – verifies token, hashes new password, updates user, revokes token.

## Libraries used
- **mongoose** – used for transactions or direct model calls (e.g., `UserModel`) if needed.
- **node:crypto** – for generating random bytes (verification codes, tokens) and for password hashing (using `crypto.pbkdf2` or argon2, but likely a lib like bcrypt is not imported; `crypto` can hash with `scrypt` or `pbkdf2` as well). Alternatively, it might use `crypto` for random tokens.
- **../../../../database/models/user.model.js** – `UserModel` for direct updates.
- **../../../modules/shared/enums/roles.js** – `RoleKey`.
- **../../../core/errors/http-status.js** – `HttpStatus` object to throw `Unauthorized`, `Conflict`, `NotFound`, etc.
- **../../../../database/repositories/user.repository.js** – `userRepository` for CRUD.
- **../../../config/env.js** – `getEnv` for config values.
- **../../../config/logger.js** – `getLogger` for logging.

## Logic implemented (example for `register`)
1. Check if email already exists in DB using `userRepository.findByEmail`.
2. If exists, throw `HttpStatus.Conflict('Email already registered')`.
3. Hash password using `crypto` (or a separate hashing utility).
4. Generate a verification code (e.g., 6‑digit random number).
5. Create user via `userRepository.createUser({ email, passwordHash, fullName, role: RoleKey.PUBLIC, accountStatus: 'UNVERIFIED', verificationCode: hashedCode })`.
6. Send email with the code.
7. Generate access and refresh tokens (using JWT with `getEnv('JWT_SECRET')` and expiry).
8. Store refresh token in `RefreshTokenModel`.
9. Return `{ user, accessToken, refreshToken }`.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
