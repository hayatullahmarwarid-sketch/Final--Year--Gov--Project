<!-- purpose-doc: normalized -->
# Exam Lifecycle Rules (`exam-lifecycle.rules.js`)

## Scenario
An exam can be in one of several lifecycle states: `DRAFT`, `ACTIVE`, `ARCHIVED` (and possibly `DELETED`). Not all transitions are allowed—for example, you cannot move an exam directly from `DRAFT` to `ARCHIVED`, and once archived it should not go back to draft. The admin UI must respect these rules, and the service must enforce them server‑side. This module defines the allowed transitions and provides an assertion function that throws an error when an invalid transition is attempted.

## What it does
Exports two items:

- **`EXAM_ADMIN_LIFECYCLE_TRANSITIONS`** – a frozen mapping that lists, for each current lifecycle, the set of allowed next lifecycles. For example:
  ```js
  {
    [ExamLifecycle.DRAFT]: [ExamLifecycle.ACTIVE, ExamLifecycle.DELETED],
    [ExamLifecycle.ACTIVE]: [ExamLifecycle.ARCHIVED],
    [ExamLifecycle.ARCHIVED]: [], // no further transitions
  }

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
