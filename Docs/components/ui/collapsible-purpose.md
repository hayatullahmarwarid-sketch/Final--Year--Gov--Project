<!-- purpose-doc: normalized -->
# Collapsible (`collapsible.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {`

Path in repo: `components/ui/collapsible.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `collapsible.tsx`.

## Libraries used

- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **@/components/themed-text** (`{ ThemedText }`) – UI component.
- **@/components/themed-view** (`{ ThemedView }`) – UI component.
- **@/components/ui/icon-symbol** (`{ IconSymbol }`) – UI component.
- **@/constants/theme** (`{ Colors }`) – shared constants.
- **@/hooks/use-color-scheme** (`{ useColorScheme }`) – custom React hook.

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
