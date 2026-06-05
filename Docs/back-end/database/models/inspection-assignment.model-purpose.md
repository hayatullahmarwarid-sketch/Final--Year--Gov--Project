<!-- purpose-doc: normalized -->
# Inspection Assignment Model (`inspection-assignment.model.js`)

## Scenario
When an admin assigns an inspection template to a field inspector, an assignment record is created. It links a template, an inspector (user), a location (derived from the template), a deadline, and a status (pending, in‑progress, completed). The inspector sees these assignments as tasks. Reminders are sent based on the deadline.

## What it does
Schema with `templateId`, `inspectorId`, `location` (string or object), `deadline`, `status` (enum from `INSPECTION_ASSIGNMENT_STATUS_KEYS`), `assignedBy`, `notes`. Applies `standardDomainPlugin`. Exported as `InspectionAssignmentModel`.

## Libraries used
- **mongoose**.
- **../../src/modules/shared/enums/inspection-assignment-status.js**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `templateId`: ObjectId, ref: `'InspectionTemplate'`.
   - `inspectorId`: ObjectId, ref: `'User'`.
   - `location`: String, default from template.
   - `deadline`: Date.
   - `status`: enum.
   - `assignedBy`: ObjectId, ref: `'User'`.
   - `notes`: optional String.
2. Indexes: `inspectorId + status`, `deadline + status` (for deadline reminders).
3. Plugin adds tenant and soft‑delete.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
