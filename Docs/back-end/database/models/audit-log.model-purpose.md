<!-- purpose-doc: normalized -->
# Audit Log Model (`audit-log.model.js`)

## Scenario
Every significant action on the platform—login, logout, create/update/delete of critical entities, permission changes, etc.—must be recorded for security and compliance. The audit log model stores these immutable records, capturing who performed the action, what action was taken, on which resource, when it happened, and any relevant metadata. Administrators later query these logs to investigate incidents, produce activity reports, or meet regulatory requirements.

## What it does
The schema defines fields common to audit entries: the actor (user reference), the action type (e.g., `LOGIN`, `CREATE_STAFF`, `DELETE_DECREE`), the target resource type and ID, a human‑readable description, the IP address of the actor, and a timestamp. It uses no special plugins beyond the standard Mongoose setup. The model is exported with the `mongoose.models.AuditLog ?? mongoose.model(...)` pattern to prevent re‑compilation in hot‑reload environments.

## Libraries used
- **mongoose** – schema definition and model creation.

## Logic implemented
1. A schema is defined with fields such as:
   - `actor` – reference to the `User` model.
   - `action` – string, enum of allowed actions.
   - `resourceType` – e.g., `'User'`, `'Decree'`.
   - `resourceId` – ObjectId referencing the target.
   - `description` – optional string for a human‑readable summary.
   - `ip` – string for the actor’s IP address.
   - `timestamp` – Date, default `Date.now`.
2. Indexes are likely created for `actor`, `action`, `resourceType+resourceId`, and `timestamp` to support efficient filtering and pagination.
3. The model is registered conditionally to avoid overwriting in development with hot module replacement.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
