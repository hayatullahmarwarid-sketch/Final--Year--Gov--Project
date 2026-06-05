<!-- purpose-doc: normalized -->
# Certificate Model (`certificate.model.js`)

## Scenario
When an inspector completes training or passes an exam, the system issues a certificate. This model stores the certificate’s metadata: who it belongs to, which exam/training it relates to, its kind (e.g., “Exam”, “Training”), its status (e.g., “Active”, “Revoked”), a unique reference number for public verification, and issue/expiry dates. The certificate can be downloaded as a PDF, and third parties can verify its authenticity using the reference number.

## What it does
Defines a Mongoose schema for certificates with fields such as `userId`, `examId`/`trainingId`, `kind` (enum from `CERTIFICATE_KIND_KEYS`), `status` (enum from `CERTIFICATE_STATUS_KEYS`), `reference`, `issuedAt`, `expiresAt`. It applies the `standardDomainPlugin` for multi‑tenant and soft‑delete support. The model is exported as `CertificateModel` with the usual `??` guard.

## Libraries used
- **mongoose** – schema and model.
- **../../src/modules/shared/enums/certificate-status.js** – status enum.
- **../../src/modules/shared/enums/certificate-kind.js** – kind enum.
- **./plugins/standard-domain.plugin.js** – adds `tenantId`, `deletedAt`, and listing index.

## Logic implemented
1. Schema fields:
   - `userId`: ObjectId, required, ref: `'User'`.
   - `examId`: ObjectId, optional, ref: `'Exam'`.
   - `trainingId`: ObjectId, optional.
   - `kind`: enum from `CERTIFICATE_KIND_KEYS`.
   - `status`: enum from `CERTIFICATE_STATUS_KEYS`, default `'ACTIVE'`.
   - `reference`: unique string for verification.
   - `issuedAt`, `expiresAt`: dates.
2. Applies `standardDomainPlugin` with `withTenant: true` (depending on config).
3. Unique index on `reference`.
4. Compound indexes for `userId + status` and `examId` for quick lookup.
5. The model is conditionally compiled.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
