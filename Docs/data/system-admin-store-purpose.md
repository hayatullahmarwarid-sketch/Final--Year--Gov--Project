<!-- purpose-doc: normalized -->
# System Admin Store (`system-admin-store.ts`)

## Scenario

Bundled or typed **data modules** are loaded when features need catalogues, stores, or model shapes shared across the app.

## What it does

The file exports the following surface (representative `export` lines):

- `export type LogSeverity = "success" | "info" | "warning" | "danger";`
- `export type AuditStatus = "SUCCESS" | "FAILURE";`
- `export interface AuditLogEntry {`
- `export interface Department {`
- `export type StaffRole = "super_admin" | "decree_dept" | "inspector_admin" | "inspector" | "public_user";`
- `export interface StaffUser {`
- `export interface RoleTotals {`
- `export interface AdminNotification {`
- `export interface SystemAdminOverviewSnapshot {`
- `export interface SystemAdminState {`
- `export function totalDecreesInCatalog(): number {`
- `export function computeRoleTotals(staffUsers: StaffUser[]): RoleTotals {`
- `export function subscribeSystemAdmin(listener: () => void) {`
- `export function getSystemAdminState(): SystemAdminState {`
- `export function useSystemAdminStore(): SystemAdminState {`
- `export function formatRelativeTime(iso: string): string {`
- `export function formatHeaderDate(d = new Date()): string {`
- `export const systemAdminActions = {`
- … (15 additional export lines in file)

Path in repo: `data/system-admin-store.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `system-admin-store.ts`.

## Libraries used

- **@react-native-async-storage/async-storage** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **@/data/public-decrees-catalog** (`{ CATEGORIES }`) – project module.
- **@/lib/api/system-admin** (`type { AuditActivityBucketRow }`) – app API and data access helper.
- **@/services/admin-portal-auth** (`{ syncAdminPortalsFromStaffUsers }`) – project module.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
