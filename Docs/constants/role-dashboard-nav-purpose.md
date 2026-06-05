<!-- purpose-doc: normalized -->
# Role Dashboard Nav (`role-dashboard-nav.ts`)

## Scenario

Static configuration and design tokens are read whenever modules import this file—often during render to keep UI and behaviour consistent.

## What it does

The file exports the following surface (representative `export` lines):

- `export type RoleNavItem = {`
- `export type RoleNavSection = {`
- `export type RoleDrawerBrand = {`
- `export function navSectionsForRole(role: AuthSessionRole, t: TFunc): RoleNavSection[] {`
- `export function navItemsForRole(role: AuthSessionRole): RoleNavItem[] {`
- `export function drawerBrandingForRole(role: AuthSessionRole, t: TFunc): RoleDrawerBrand {`
- `export function organizationLabelForRole(role: AuthSessionRole, t: TFunc): string {`
- `export function defaultTitleForRole(role: AuthSessionRole): string {`
- `export function systemAdminHeaderTitleForPath(pathname: string, t: TFunc): string {`

Path in repo: `constants/role-dashboard-nav.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `role-dashboard-nav.ts`.

## Libraries used

- **@expo/vector-icons** – third-party dependency for this module.
- **expo-router** – third-party dependency for this module.
- **@/contexts/auth-session-context** (`type { AuthSessionRole }`) – shared React context.

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
