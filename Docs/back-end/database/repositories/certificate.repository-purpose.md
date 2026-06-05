<!-- purpose-doc: normalized -->
# Certificate Repository (`certificate.repository.js`)

## Scenario
Public users view their own certificates; third parties verify a certificate by reference; admins manage all certificates (revoke, view by exam, etc.). The repository supports all these queries and uses enums for certificate kind and status.

## What it does
Extends `BaseRepository` with `CertificateModel`. Uses `mergeFilters`. Likely methods:
- `findByUser(userId, status?)` – certificates for a specific user, optionally filtered by status.
- `findByReference(reference)` – for public verification.
- `findByExam(examId, kind?)` – certificates issued for an exam, maybe filtered by kind.
- `createCertificate(data)` – creates a new certificate.
The repository imports `CertificateKind` and `CertificateStatus` enums to build filters.

## Libraries used
- **mongoose**.
- `../models/certificate.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.
- `../../src/modules/shared/enums/certificate-kind.js`, `certificate-status.js`.

## Logic implemented
1. `findByUser`: filters by `userId`, and optionally `status: CertificateStatus.ACTIVE`.
2. `findByReference`: searches by unique `reference` field.
3. `findByExam`: filters by `examId` and optionally `kind`.
4. Create/update via base methods.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
