<!-- purpose-doc: normalized -->
# ActivityDetailsModal (`ActivityDetailsModal.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export type ActivityDetailsPayload = {`
- `export function ActivityDetailsModal({ visible, activity, onClose }: Props) {`

Path in repo: `components/dept-upload/ActivityDetailsModal.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `ActivityDetailsModal.tsx`.

## Libraries used

- **@expo/vector-icons** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **@/components/ui/AppPressable** (`{ AppPressable }`) – UI component.
- **@/constants/dept-upload-dashboard** (`{ DeptUploadDash }`) – shared constants.
- **@/contexts/dept-upload-ui-context** (`{ useDeptUploadThemeColorsOptional }`) – shared React context.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
