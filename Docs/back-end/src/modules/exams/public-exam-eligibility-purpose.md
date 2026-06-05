<!-- purpose-doc: normalized -->
# Public Exam Eligibility Checker (`public-exam-eligibility.js`)

## Scenario
A public user (inspector candidate) can take an exam. However, they must not already have an in‑progress attempt for the same exam, and there may be a limit on the number of attempts or a cooldown period between retakes. Before creating a new `ExamAttempt`, the system checks these conditions. This module provides a single assertion function that throws a `ConflictError` with a user‑friendly message when the user is not eligible.

## What it does
Exports `assertEligibleForNewExamAttempt(input)`. The `input` likely contains:
- `userId`
- `examId`
- `existingAttempts` – an array of the user’s previous attempts for this exam (pre‑fetched by the caller).

The function checks:
- If there is any attempt with status `ExamAttemptStatus.IN_PROGRESS`, the user cannot start another. Throws `ConflictError('You already have an in‑progress attempt for this exam')`.
- May check if the maximum number of attempts has been reached (based on configuration), or if a retake cool‑down period hasn’t elapsed (not imported, but could be internal logic using env or hard‑coded values, or simply based on count).
- If all checks pass, the function returns silently, allowing the new attempt to proceed.

## Libraries used
- **../shared/http/index.js** – `ConflictError` (re‑exported from app‑error).
- **../shared/enums/exam-attempt-status.js** – `ExamAttemptStatus` enum.

## Logic implemented
1. The function receives an object with `{ userId, examId, existingAttempts }`.
2. Iterate `existingAttempts`:
   - If any attempt has `status === ExamAttemptStatus.IN_PROGRESS`, throw `new ConflictError('You already have an active attempt for this exam.')`.
3. Optionally count completed/failed attempts and compare to `maxAttempts` (if such a rule is implemented). If exceeded, throw `ConflictError('Maximum number of attempts reached')`.
4. Optionally check the timestamp of the last attempt and enforce a cooldown.
5. If all checks pass, no error is thrown, and the caller can proceed to create the attempt.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
