<!-- purpose-doc: normalized -->
# Use Inspector Admin Workspace (`use-inspector-admin-workspace.ts`)

## Scenario

Multiple screens share behaviour through hooks. This hook runs when any consumer component mounts or when its dependencies change, encapsulating stateful logic.

## What it does

The file exports the following surface (representative `export` lines):

- `export type InspectorAdminDashboard = Record<string, unknown> | null;`
- `export function useInspectorAdminWorkspace(): InspectorAdminState & {`

Path in repo: `hooks/use-inspector-admin-workspace.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `use-inspector-admin-workspace.ts`.

## Libraries used

- **expo-router** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **@/constants/api** (`{ getApiBaseUrl }`) – shared constants.
- **@/lib/api/exam-audience-roles** (`{ examAudienceKeysFromApi }`) – app API and data access helper.
- **@/lib/mcq-label-utils** (`{ buildMcqForApi }`) – shared library code.
- **@/lib/api/inspector-admin** (`{ getInspectorDashboard, inspectorAdminApi }`) – app API and data access helper.
- **@/lib/api/jwt-session-storage** (`{ getJwtAccessToken }`) – app API and data access helper.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Local component state is managed with React hooks and drives re-renders when updated.
3. Network calls request or mutate remote data; results update UI state or context.
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
