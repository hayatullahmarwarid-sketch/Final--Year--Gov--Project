<!-- purpose-doc: normalized -->
# Auth Controller (`auth.controller.js`)

## Scenario
The mobile app and any other client communicate with the back‑end to perform authentication actions: registering a new public user, logging in, refreshing expired access tokens, logging out, verifying an email address, requesting a password reset, and changing account details. The controller translates HTTP requests into calls to the `AuthService`, audits security‑sensitive events, and sends structured JSON responses.

## What it does
The `authController` is an object whose methods are Express route handlers wrapped with `asyncHandler` for automatic error catching. Each method:

1. Extracts the validated body or query parameters from the request (validation is performed by middleware before reaching the controller).
2. Calls the corresponding service method in `authService` (e.g., `authService.register(body)`, `authService.login(body)`, `authService.refreshToken(body)`).
3. On success, formats the response using `sendSuccess` with the appropriate HTTP status code and payload (e.g., user object + tokens for login, or a success message).
4. On failure, the error is caught by the global error handler (because of `asyncHandler`), but the controller may also throw specific `HttpStatus` errors.
5. For security‑sensitive actions (login, register, logout, email change), it may call `auditService.log(...)` to record the event, sometimes using `emailFingerprint` to help identify the actor.

## Libraries used
- **../../../modules/shared/http/index.js** – `asyncHandler` (wraps async route handlers to forward errors) and `sendSuccess` (standardised success response).
- **../../../services/audit/auditService.js** – `auditService` for logging events and `emailFingerprint` for obfuscation/identification.
- **./auth.service.js** – `authService` (business logic class).

## Logic implemented (per method)
- `register(req, res)`: validates body, calls `authService.register(body)`, returns `201` with user and tokens, logs audit.
- `login(req, res)`: calls `authService.login(email, password)`, returns `200` with `{ user, accessToken, refreshToken }`, logs audit.
- `refreshToken(req, res)`: calls `authService.refreshToken(refreshToken)`, returns `200` with new token pair.
- `logout(req, res)`: calls `authService.logout(userId, refreshToken)`, returns `200` with message, logs audit.
- `verifyEmailSend(req, res)`: calls `authService.sendEmailVerification(email)`, returns `200` with message.
- `verifyEmailConfirm(req, res)`: calls `authService.confirmEmailVerification(email, code)`, returns `200` with token pair (user is now verified).
- `changePassword(req, res)`: calls `authService.changePassword(userId, oldPassword, newPassword)`, returns `200`.
- `changeEmail(req, res)`: calls `authService.changeEmail(userId, newEmail, password)`, returns `200` with updated user, logs audit.
- `forgotPassword(req, res)`: calls `authService.requestPasswordReset(email)`, returns `200`.
- `resetPassword(req, res)`: calls `authService.completePasswordReset(token, newPassword)`, returns `200`.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
