<!-- purpose-doc: normalized -->
# Uploads Routes (`uploads.routes.js`)

## Scenario
The mobile app and other clients need to upload files—decree PDFs, inspection evidence photos, certificate images, profile avatars—to the server. The uploads must be authenticated, authorised based on the user’s role, and restricted by file purpose (e.g., an inspector can only upload evidence for an inspection). The server validates the file metadata and the file itself (type, size) before persisting it to storage and recording the file’s metadata in the database. This route file handles the HTTP layer for all file upload operations.

## What it does
Creates an Express `Router` that defines one or more `POST` routes for file uploads. Typically the route path includes a `:purpose` parameter or the purpose is sent in the body, which identifies the type of file being uploaded (e.g., `decree_pdf`, `inspection_evidence`, `certificate`, `avatar`). The route uses `multer` to parse the multipart form data and make the file available as `req.file`. It applies:

- `authenticate` middleware to ensure a valid access token.
- `authorize` middleware (possibly inline or via a dynamic check) to restrict uploading to allowed roles.
- `validateRequest` with a Zod schema that validates the purpose (against `STORED_FILE_PURPOSE_KEYS`) and any additional metadata fields like `referenceId` (e.g., decreeId, assignmentId).
- The handler then calls `persistUpload(req.file, purpose, metadata, req.user)`, which handles storing the file (e.g., to disk or S3) and creating a `StoredFile` record.
- On success, it sends back the stored file object via `sendSuccess` with status `201`.
- Errors (e.g., invalid purpose, unsupported file type, empty file) are caught by `asyncHandler` and handled by throwing `AppError` or `BadRequestError`.
- The upload is audited using `auditService`.

## Libraries used
- **express** – Router creation.
- **multer** – multipart form data parsing, extracts the file buffer and original name, stores it in memory or disk (configured externally).
- **zod** – used by `validateRequest` to validate request body fields (purpose, referenceId, etc.).
- **../../../config/env.js** – `getEnv` for upload limits or storage paths.
- **../../../middlewares/auth.middleware.js** – `authenticate` middleware.
- **../../../middlewares/authorize.middleware.js** – `authorize` middleware (checks user’s role).
- **../../../modules/shared/http/index.js** – `asyncHandler` and `validateRequest`.
- **../../../core/errors/http-status.js** – `HttpStatus` for throwing specific HTTP errors.
- **../../../utils/api-response.js** – `sendSuccess` for standardised success responses.
- **../../../core/errors/app-error.js** – `AppError`, `BadRequestError` classes.
- **../../../services/storage/upload.service.js** – `persistUpload` service function.
- **../../../modules/shared/constants/stored-file-purpose.js** – `STORED_FILE_PURPOSE_KEYS` enum/list.
- **../../../services/audit/auditService.js** – `auditService` to log the upload event.

## Logic implemented
1. An instance of `multer` is configured (likely in an imported module or inline) with limits (file size, allowed MIME types). The route uses `upload.single('file')` as middleware to attach `req.file`.
2. The route definition might look like:
   ```js
   router.post(
     '/',
     authenticate,
     authorize(['PUBLIC', 'INSPECTOR', 'DECREE_UPLOAD_DEPT']), // example
     upload.single('file'),
     validateRequest(uploadBodySchema),
     asyncHandler(async (req, res) => {
       const { purpose, referenceId } = req.body;
       if (!STORED_FILE_PURPOSE_KEYS.includes(purpose)) {
         throw new BadRequestError('Invalid upload purpose');
       }
       // Additional per-purpose authorisation could be done here,
       // e.g., only inspectors can upload 'inspection_evidence'.
       const storedFile = await persistUpload(req.file, purpose, { referenceId }, req.user);
       auditService.log('UPLOAD', req.user._id, { fileId: storedFile._id, purpose });
       sendSuccess(res, HttpStatus.CREATED, storedFile);
     })
   );

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
