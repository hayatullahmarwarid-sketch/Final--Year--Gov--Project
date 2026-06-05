<!-- purpose-doc: normalized -->
# Decree Publish Workflow (`decree-publish.workflow.js`)

## Scenario
When a department officer finalises a decree and marks it for publication, the system must perform several actions atomically: update the decree’s lifecycle status, create an audit trail, possibly generate a PDF, and fan out notifications to subscribed users. The `DecreePublishWorkflow` orchestrates these steps, ensuring that all side effects happen reliably. It is invoked from the decree controller or from a background job handler.

## What it does
Exports a class `DecreePublishWorkflow` and a singleton instance `decreePublishWorkflow`. The main method (likely `execute` or `publish`) receives a decree ID and the publishing user’s info. It delegates to `decreeUploadService` to perform the core operations:

- Validates that the decree exists and is in a publishable state (e.g., draft, reviewed).
- Changes the decree’s `lifecycle` to `DecreeLifecycle.PUBLISHED` via the service.
- Calls any post‑publish actions configured in the service (e.g., PDF generation, notification fan‑out).
- Logs the publication event.

The workflow does not contain business logic itself; it serves as a thin entry point that the job handler or controller can call, isolating the multi‑step process from the transport layer.

## Libraries used
- **../decree-upload/decree-upload.service.js** – `decreeUploadService` which contains the actual publishing logic, database operations, and notification enqueuing.

## Logic implemented
1. The workflow’s `publish(decreeId, userId)` (or similar method) is called.
2. It constructs a payload (e.g., `{ decreeId, userId }`) and calls `decreeUploadService.publishDecree(payload)`.
3. The service (not shown here) handles:
   - Fetching the decree.
   - Setting `lifecycle` to `PUBLISHED` and saving.
   - Optionally enqueuing a PDF generation job.
   - Enqueuing a notification fan‑out to public users about the new decree.
   - Auditing the action.
4. If the service throws, the error propagates; otherwise, the workflow returns the updated decree or a success indicator.
5. This separation allows the workflow to be reused by both HTTP controllers (synchronous) and background jobs (asynchronous), with the same business guarantees.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
