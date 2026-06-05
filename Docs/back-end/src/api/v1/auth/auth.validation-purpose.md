<!-- purpose-doc: normalized -->
# Auth Validation Schemas (`auth.validation.js`)

## Scenario
Every incoming request to the auth endpoints must be validated to prevent malformed or malicious data. Instead of writing manual checks in each controller, this module defines Zod schemas that describe the expected shape, types, and constraints for each auth‑related request. The `validateRequest` middleware uses these schemas to automatically validate the request and return detailed errors if it fails.

## What it does
The file exports several Zod validation schemas:

- `strongPasswordSchema` – (re‑exported from a shared location) defines password requirements: minimum length (e.g., 8), at least one uppercase, one lowercase, one digit, etc.
- `registerBodySchema` – validates the `POST /register` body. Fields: `email` (valid email format), `password` (using `strongPasswordSchema`), `fullName` (non‑empty string), `provinceId`, `districtId` (optional strings).
- `loginBodySchema` – validates `POST /login` body. Fields: `email` (email format), `password` (string).
- `refreshBodySchema` – validates `POST /refresh-token`. Fields: `refreshToken` (string).
- `logoutBodySchema` – validates `POST /logout`. Fields: `refreshToken` (optional string, or `all: true`).
- `patchMeBodySchema` – validates `PATCH /me` body for updating profile. Fields may include `email`, `password` (current password for verification), `newPassword`, `fullName`, etc. Typically uses `strongPasswordSchema` for new password fields.
- `emailVerificationSendBodySchema` – validates `POST /verify-email/send`. Fields: `email` (email format).
- `emailVerificationConfirmBodySchema` – validates `POST /verify-email/confirm`. Fields: `email`, `code` (string, e.g., 6 digits).
- `passwordResetRequestBodySchema` – validates `POST /password-reset/request`. Fields: `email`.
- `passwordResetCompleteBodySchema` – validates `POST /password-reset/complete`. Fields: `token` (string), `newPassword` (using `strongPasswordSchema`).

All schemas use Zod’s `.strict()` or `.strip()` to reject unknown properties, ensuring clients do not send unexpected data.

## Libraries used
- **zod** – schema declaration and validation.

## Logic implemented
1. Import `zod` (as `z`).
2. Import `sharedStrongPasswordSchema` from a shared validation file (not shown in relative imports, but re‑exported here).
3. Define each schema by calling `z.object({...})` with appropriate field validators:
   - `z.string().email()` for email.
   - `z.string().min(8).regex(...)` for password via `strongPasswordSchema`.
   - `z.string().min(1)` for required strings.
   - `z.string().optional()` for optional fields.
4. Export each schema individually so the routes file can use them with `validateRequest`.
5. The schemas are used as middleware: `validateRequest(loginBodySchema)` will automatically validate `req.body` and, if invalid, respond with a `422` status and an array of Zod error messages.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
