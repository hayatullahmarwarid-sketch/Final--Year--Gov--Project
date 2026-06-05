<!-- purpose-doc: normalized -->
# Auth Routes (`auth.routes.js`)

## Scenario
The back‑end exposes a set of REST endpoints under `/api/v1/auth/` for authentication operations. This file defines which URL path maps to which controller method, and applies necessary middleware such as request validation and authentication for protected endpoints like changing password or email.

## What it does
Creates an Express `Router` and defines routes:

- **Public routes** (no authentication required):
  - `POST /register` – uses `validateRequest(registerBodySchema)` to validate the body, then calls `authController.register`.
  - `POST /login` – validates with `loginBodySchema`, calls `authController.login`.
  - `POST /refresh-token` – validates with `refreshBodySchema`, calls `authController.refreshToken`.
  - `POST /logout` – validates with `logoutBodySchema`, calls `authController.logout`.
  - `POST /verify-email/send` – validates with `emailVerificationSendBodySchema`, calls `authController.verifyEmailSend`.
  - `POST /verify-email/confirm` – validates with `emailVerificationConfirmBodySchema`, calls `authController.verifyEmailConfirm`.
  - `POST /password-reset/request` – validates with `passwordResetRequestBodySchema`, calls `authController.forgotPassword`.
  - `POST /password-reset/complete` – validates with `passwordResetCompleteBodySchema`, calls `authController.resetPassword`.

- **Protected routes** (require a valid access token):
  - `PATCH /me` – applies `authenticate` middleware to attach the user, then validates with `patchMeBodySchema`, calls `authController.changeEmail` or `authController.changePassword` (the controller may handle multiple updates via the same endpoint or separate ones; the route here likely uses `PATCH /me` for updating profile fields like email/password).
  - `PATCH /me/password` – (if separated) would also use `authenticate` and validation.

The router is exported as `authRouter`.

## Libraries used
- **express** – Router creation.
- **../../../modules/shared/http/index.js** – `validateRequest` middleware that takes a Zod schema and validates the request body/query/params.
- **../../../middlewares/auth.middleware.js** – `authenticate` middleware that verifies the JWT access token and attaches the user object.
- **./auth.controller.js** – `authController` with route handlers.

## Logic implemented
1. A new `Router` instance is created.
2. Public routes are defined with `router.post(...)`.
3. For each route requiring validation, `validateRequest(schema)` is added before the controller method. This middleware validates the request and returns a 422 error if it fails.
4. For protected self‑edit routes, `authenticate` is placed before validation. If the token is missing or invalid, a 401 response is sent.
5. The router is exported so it can be mounted in the main app: `app.use('/api/v1/auth', authRouter)`.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
