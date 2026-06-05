<!-- purpose-doc: normalized -->
# Certificate Issue Job Handler (`certificate-issue.handler.js`)

## Scenario
When a user completes an exam or a training course, the system must issue a certificate. Generating the certificate involves several steps—creating the certificate record in the database, rendering the PDF, storing it, and possibly notifying the user. These steps can be time‑consuming, so they should not block the HTTP response that confirms the exam submission. Instead, a background job is enqueued with the necessary data (user ID, exam ID, etc.). This handler is invoked by the job queue to execute the actual workflow.

## What it does
The `certificateIssueHandler(job)` function receives a job object with a payload containing the details required for certificate issuance. It delegates the entire process to `certificateIssueWorkflow` (imported from a workflow module). The handler acts as a thin adapter between the job queue infrastructure and the business logic, simply calling the workflow and awaiting its result. If the workflow throws an error, the job queue’s error handling (retry, dead letter queue) can manage it.

## Libraries used
- **../../modules/certificates/certificate-issue.workflow.js** – `certificateIssueWorkflow` function that executes the multi‑step process.

## Logic implemented
1. The handler receives an object `job` that typically contains `job.data` with properties like `{ userId, examId }`.
2. It calls `await certificateIssueWorkflow(job.data)`.
3. The workflow itself handles all database operations, PDF generation, file storage, and notification creation.
4. The handler does not add extra logic; it simply returns the result (or throws on error) so the job queue can mark the job as completed or failed.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
