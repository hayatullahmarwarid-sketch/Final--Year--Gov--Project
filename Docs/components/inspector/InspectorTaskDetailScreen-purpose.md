<!-- purpose-doc: normalized -->
# InspectorTaskDetailScreen (`InspectorTaskDetailScreen.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export function InspectorTaskDetailScreen() {`

Path in repo: `components/inspector/InspectorTaskDetailScreen.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `InspectorTaskDetailScreen.tsx`.

## Libraries used

- **@expo/vector-icons** – third-party dependency for this module.
- **expo-router** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **react-native-safe-area-context** – third-party dependency for this module.
- **@/constants/brand** (`{ Brand }`) – shared constants.
- **@/contexts/inspector-workspace-context** (`{ useInspectorWorkspace }`) – shared React context.
- **./InspectorBottomNav** (`{ InspectorBottomNav, inspectorBottomNavOffset }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Expo Router (`useRouter` or imperative navigation) changes the active screen based on user actions or completion of async work.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
