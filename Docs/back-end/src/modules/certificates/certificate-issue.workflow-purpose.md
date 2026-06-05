<!-- purpose-doc: normalized -->
# Certificate Issue Workflow (`certificate-issue.workflow.js`)

## Scenario
A user has passed an exam or completed a training, and the system must now issue an official certificate. This process involves creating the certificate record, generating a unique verification token, rendering a styled PDF with a QR code, uploading the PDF to file storage, and linking it back to the certificate document. All of these steps are orchestrated as a unit by this workflow so that the background job handler only has to invoke it.

## What it does
Exports a class `CertificateIssueWorkflow` and an instantiated singleton `certificateIssueWorkflow`. The main method (likely `execute` or `run`) accepts a payload containing `userId`, `examId` (or `trainingId`), and possibly a `kind`. It performs the following steps sequentially:

1. **Validates the user and exam/training**: Uses `UserModel` and `ExamModel` to verify they exist; throws `NotFoundError` if not.
2. **Creates the certificate record**: Inserts a document into `CertificateModel` with status `'ACTIVE'`, kind, user/exam references, issue date, and optionally expiry.
3. **Generates a verification token** by calling `createVerifyToken(certificate._id, issuedAt)`. This token is embedded in a QR code and can later be used to verify the certificate’s authenticity.
4. **Renders the PDF**: Calls `renderCertificatePdf({ certificate, user, exam, verifyToken })` to produce a PDF buffer.
5. **Stores the PDF**: Uses `getStorageProvider()` to upload the PDF file, then creates a `StoredFileModel` record with the resulting URL/key, purpose `CERTIFICATE`, and entity type.
6. **Updates the certificate**: Sets the `storedFileId` on the certificate document and stores the verification token hash (or reference) for later lookup.
7. **Enqueues a notification fan‑out job** (via `enqueue(QUEUE.NOTIFICATIONS_FANOUT, ...)`) to push a “certificate issued” notification to the user’s devices.
8. Logs progress and errors with `getLogger`.

## Libraries used
- **mongoose** – for database transactions (implicit through models).
- **qrcode** – used by the PDF renderer, indirectly.
- **../../../database/models/certificate.model.js** – `CertificateModel`.
- **../../../database/models/user.model.js** – `UserModel`.
- **../../../database/models/exam.model.js** – `ExamModel`.
- **../../../database/models/stored-file.model.js** – `StoredFileModel`.
- **../../core/errors/app-error.js** – `NotFoundError`.
- **../../config/env.js** – `getEnv` for configuration.
- **../../config/logger.js** – `getLogger`.
- **../../services/storage/get-storage-provider.js** – `getStorageProvider` to store the PDF.
- **../shared/constants/stored-file-purpose.js** – `StoredFilePurpose` (e.g., `CERTIFICATE`).
- **../shared/constants/stored-entity-type.js** – `StoredEntityType` (e.g., `Certificate`).
- **../../jobs/queue-registry.js** – `enqueue`.
- **../../jobs/queue-names.js** – `QUEUE` constants.
- **./certificate-verify-token.js** – `createVerifyToken`.
- **./certificate-pdf.renderer.js** – `renderCertificatePdf`.

## Logic implemented
1. `execute({ userId, examId, kind?, ... })` is called.
2. It fetches the user and exam. If either is missing, it throws `NotFoundError`.
3. It creates the certificate with `CertificateModel.create({ userId, examId, kind, status: 'ACTIVE', issuedAt: new Date() })`.
4. Generates `verifyToken = createVerifyToken(certificate._id, issuedAt)`.
5. Renders PDF: `const pdfBuffer = await renderCertificatePdf({ certificate, user, exam, verifyToken })`.
6. Uploads to storage and creates `StoredFileModel` record.
7. Updates certificate: `certificate.storedFileId = storedFile._id; certificate.verifyTokenHash = hash(verifyToken); await certificate.save()`.
8. Enqueues fan‑out: `await enqueue(QUEUE.NOTIFICATIONS_FANOUT, 'certificate-issued', { userId, certificateId, title, body })`.
9. Returns the certificate object.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
