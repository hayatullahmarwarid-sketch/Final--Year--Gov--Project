<!-- purpose-doc: normalized -->
# System Admin Mapper (`system-admin-mapper.ts`)

## Scenario

Shared **library** code runs wherever imported—typically during screen render, event handlers, or background sync—to centralise formatting, storage, or cross-cutting behaviour.

## What it does

The file exports the following surface (representative `export` lines):

- `export function resolveStaffDisplayName(row: SystemAdminStaffMember): string {`
- `export function apiRoleKeyToStaffRole(key: string | null | undefined): StaffRole {`
- `export function staffRoleToApiRoleKey(role: StaffRole): string {`
- `export function staffMemberToStaffUser(row: SystemAdminStaffMember): StaffUser {`
- `export function auditRowToEntry(row: SystemAdminAuditLogRow): AuditLogEntry | null {`
- `export function roleBreakdownToTotals(rows: { roleKey: string; total: number }[] | undefined): RoleTotals {`

Path in repo: `lib/system-admin-mapper.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `system-admin-mapper.ts`.

## Libraries used

- **@/data/system-admin-store** (`type { AuditLogEntry, RoleTotals, StaffRole, StaffUser }`) – project module.
- **@/lib/api/system-admin** (`type { SystemAdminAuditLogRow, SystemAdminStaffMember }`) – app API and data access helper.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
