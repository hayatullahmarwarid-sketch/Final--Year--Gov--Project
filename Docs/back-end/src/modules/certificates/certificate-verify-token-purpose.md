<!-- purpose-doc: normalized -->
# Certificate Verification Token Utilities (`certificate-verify-token.js`)

## Scenario
Each certificate needs a unique, tamper‑proof identifier that can be embedded in a QR code. When someone scans the QR code, the app sends the token to the server, which must verify its authenticity and extract the certificate ID. This module provides two functions: one to create a signed token (which is essentially a JWT‑like string) and one to parse and verify it. The token includes the certificate ID and issue date, and is signed with a secret so that forgery is impossible.

## What it does
Exports two functions:
- **`createVerifyToken(certificateId, issuedAt)`** – generates a verifiable token string containing the `certificateId` and `issuedAt` claims. It uses `node:crypto` to create a signature (or a full JWT) with a secret from `getEnv()` (e.g., `CERTIFICATE_VERIFY_SECRET`). The token is returned as a plain string that can be appended to a URL.
- **`parseVerifyToken(token)`** – verifies the token’s signature and extracts the payload. If the token is invalid, expired, or tampered with, it returns `null` or throws. Otherwise it returns an object with `{ certificateId, issuedAt }`.

## Libraries used
- **node:crypto** – for HMAC or symmetric encryption to sign and verify the token.
- **../../config/env.js** – `getEnv()` for the secret key and optional TTL.

## Logic implemented
1. **`createVerifyToken`**:
   - Constructs a payload object `{ certificateId: certificateId.toString(), issuedAt: issuedAt.toISOString() }`.
   - Serialises the payload to a base64 string (similar to JWT but simpler, e.g., `base64(payload)`).
   - Creates an HMAC‑SHA256 signature of the payload using the secret.
   - Returns `${payloadBase64}.${signature}`.
2. **`parseVerifyToken`**:
   - Splits the token on `.`; if not two parts, return `null`.
   - Decodes the payload from base64.
   - Recomputes the signature from the payload and secret; compares it to the provided signature.
   - If signatures don’t match, return `null` or throw.
   - Optionally checks if the token is expired (if `issuedAt` is older than a configured TTL).
   - Returns `{ certificateId, issuedAt }` on success.
3. This simple signing approach avoids the overhead of full JWT while providing enough security for certificate verification.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
