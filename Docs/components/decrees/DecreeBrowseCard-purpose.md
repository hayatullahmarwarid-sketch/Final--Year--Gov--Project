<!-- purpose-doc: normalized -->
# DecreeBrowseCard (`DecreeBrowseCard.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export function DecreeBrowseCard({ item, onView, onDownload }: DecreeBrowseCardProps) {`

Path in repo: `components/decrees/DecreeBrowseCard.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `DecreeBrowseCard.tsx`.

## Libraries used

- **@expo/vector-icons** – third-party dependency for this module.
- **expo-haptics** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **react-native-svg** – third-party dependency for this module.
- **@/contexts/public-user-data-context** (`{ usePublicUserData }`) – shared React context.
- **@/constants/brand** (`{ Brand }`) – shared constants.
- **@/constants/form** (`{ FormColors }`) – shared constants.
- **@/constants/home** (`{ HomeColors }`) – shared constants.
- **@/data/decree-models** (`type { DecreeListItem }`) – project module.
- **@/hooks/use-app-translation** (`{ useAppTranslation }`) – custom React hook.
- **@/lib/theme** (`{ palette }`) – shared library code.

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
