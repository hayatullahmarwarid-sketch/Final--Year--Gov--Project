<!-- purpose-doc: normalized -->
# DecreeHierarchicalSelect (`DecreeHierarchicalSelect.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export function DecreeHierarchicalSelect({ value, onChange, placeholder }: Props) {`

Path in repo: `components/inspector-admin/DecreeHierarchicalSelect.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `DecreeHierarchicalSelect.tsx`.

## Libraries used

- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **@/constants/brand** (`{ Brand }`) – shared constants.
- **@/constants/form** (`{ FormColors }`) – shared constants.
- **@/data/public-decrees-catalog** (`{ CATEGORIES }`) – project module.
- **@/hooks/use-app-translation** (`{ useAppTranslation }`) – custom React hook.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Local component state is managed with React hooks and drives re-renders when updated.
3. Network calls request or mutate remote data; results update UI state or context.
4. Express routing maps HTTP methods and paths to handlers (often composed with `asyncHandler` and validation middleware).
5. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
6. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
