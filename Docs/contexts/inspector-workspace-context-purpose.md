<!-- purpose-doc: normalized -->
# Inspector Workspace Context (`inspector-workspace-context.tsx`)

## Scenario

Global or subtree state is provided through React context. This module is active while its provider wraps part of the tree and consumers read or update that shared state.

## What it does

The file exports the following surface (representative `export` lines):

- `export type InspectorActivityItem = {`
- `export function InspectorWorkspaceProvider({ children }: { children: React.ReactNode }) {`
- `export function useInspectorWorkspace(): InspectorWorkspaceValue {`

Path in repo: `contexts/inspector-workspace-context.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `inspector-workspace-context.tsx`.

## Libraries used

- **expo-router** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **@/constants/api** (`{ getApiBaseUrl }`) – shared constants.
- **@/lib/api/inspectors** (`{ getInspectorsDashboard }`) – app API and data access helper.
- **@/lib/api/jwt-session-storage** (`{ getJwtAccessToken }`) – app API and data access helper.
- **@/lib/i18n/init** (`i18n`) – shared library code.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Local component state is managed with React hooks and drives re-renders when updated.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
