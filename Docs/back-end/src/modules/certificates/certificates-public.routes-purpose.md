<!-- purpose-doc: normalized -->
# Public Certificate Routes (`certificates-public.routes.js`)

## Scenario
A third party—an employer, a government agency, or a member of the public—wants to verify the authenticity of a certificate. They scan a QR code or type a reference number. The back‑end must expose a public endpoint (no authentication required) that accepts a verification token or certificate reference, looks up the certificate, and returns the holder’s name, certificate title, status, and issue date. This file defines those public routes.

## What it does
Creates an Express `Router` with likely two endpoints:

- **`GET /verify?token=...`** – parses the verification token from the query string using `parseVerifyToken` (which decodes and validates the token, extracting `certificateId` and `issuedAt`). It then fetches the corresponding certificate from `CertificateModel` (populated with user/exam data if needed). If the certificate is not found or token is invalid, it throws a `NotFoundError`. On success, it returns the certificate details using `sendSuccess`.
- **`POST /verify-by-ref`** or **`GET /verify/:reference`** – looks up a certificate by its unique public reference number (if such a field exists) using `CertificateModel.findOne({ reference })`. Returns the same public details.

Both endpoints use `validateRequest` with Zod schemas to ensure the token or reference is correctly formatted. Handlers are wrapped in `asyncHandler` for automatic error catching.

## Libraries used
- **express** – Router creation.
- **mongoose** – used implicitly via `CertificateModel`.
- **zod** – for request validation schemas.
- **../shared/http/index.js** – `asyncHandler`, `sendSuccess`, `validateRequest`.
- **../../core/errors/app-error.js** – `NotFoundError`.
- **../../../database/models/certificate.model.js** – `CertificateModel`.
- **./certificate-verify-token.js** – `parseVerifyToken`.

## Logic implemented
1. Defines a Zod schema for the token verification query (e.g., `z.object({ token: z.string() })`).
2. `GET /verify`:
   - Validates query with schema.
   - Calls `parseVerifyToken(token)`; if invalid, throws `NotFoundError`.
   - Finds certificate by `_id: certificateId` with `deletedAt: null`.
   - If not found, throws `NotFoundError('Certificate not found or revoked')`.
   - Returns `{ holder: user.name, exam, issuedAt, status, reference }`.
3. Similar for lookup by reference.
4. The router is exported as `certificatesPublicRouter` and mounted at `/api/v1/certificates/public`.

## Roles

- **public** — Direct: Public HTTP surface for end users.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
