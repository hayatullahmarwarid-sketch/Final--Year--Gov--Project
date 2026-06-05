<!-- purpose-doc: normalized -->
# RegionalMetricsCard (`RegionalMetricsCard.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export type ZoneMetric = {`
- `export type ZoneLocationRow = {`
- `export type ZoneQuarterRow = {`
- `export type SelectedZoneDetail = {`
- `export function RegionalMetricsCard({`

Path in repo: `components/inspector-admin/RegionalMetricsCard.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `RegionalMetricsCard.tsx`.

## Libraries used

- **@expo/vector-icons** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **@/components/ui/AppPressable** (`{ AppPressable }`) – UI component.
- **@/hooks/use-app-translation** (`{ useAppTranslation }`) – custom React hook.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
