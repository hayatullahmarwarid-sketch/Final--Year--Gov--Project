<!-- purpose-doc: normalized -->
# RBAC Placeholder Constants (`rbac-placeholders.js`)

## Scenario
The application is being built incrementally, and the full role‑based access control (RBAC) system is planned for a later phase. However, developers working on controllers and services already know which actions each role should be allowed to perform—public users can read decrees, inspectors can submit inspections, admins can create exams, etc. Rather than writing raw strings like `'create:decree'` scattered across the codebase (which would be hard to refactor later) or waiting until the full RBAC middleware is ready, this module provides a central, frozen dictionary of permission constants and a default mapping of roles to permission sets. Teams can import these constants immediately, use them in logic or documentation, and later plug into the mature authorization system without changing existing code.

## What it does
Exports two frozen objects:

- **`Permission`** – an enumeration of all permission keys as dot‑notation strings, for example:
  ```js
  {
    READ_DECREE: 'read:decree',
    CREATE_DECREE: 'create:decree',
    SUBMIT_INSPECTION: 'submit:inspection',
    CREATE_EXAM: 'create:exam',
    // … etc.
  }

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
