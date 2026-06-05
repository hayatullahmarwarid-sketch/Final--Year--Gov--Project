<!-- purpose-doc: normalized -->
# Audit Log Repository (`audit-log.repository.js`)

## Scenario
Administrators view and filter audit logs—login events, entity changes—paginated and sorted by date. The repository provides a method to fetch audit log entries with optional filtering by actor, action, resource, or date range, and to create new audit entries when actions occur.

## What it does
Extends `BaseRepository` with `AuditLogModel`. Uses `mergeFilters` to build queries. Likely offers:
- `findLogs({ actorId, action, resourceType, resourceId, fromDate, toDate, sort, pagination })` – builds a filter combining the optional fields.
- `createEntry({ actor, action, resourceType, resourceId, description, ip })` – creates a new audit log document.
The singleton `auditLogRepository` is exported.

## Libraries used
- **mongoose** – via model.
- `../models/audit-log.model.js` – the model.
- `./base.repository.js` – base CRUD.
- `./repository.helpers.js` – `mergeFilters`.

## Logic implemented
1. `findLogs` uses `mergeFilters` to combine `actor` (actorId), `action`, `resourceType+resourceId`, and `timestamp` range.
2. Calls `this.find(filter, { sort, offset, limit })`.
3. `createEntry` calls `this.create({ ... })`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
