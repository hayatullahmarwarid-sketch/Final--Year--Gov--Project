<!-- purpose-doc: normalized -->
# App Bootstrap (`app-bootstrap.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export function AppBootstrap({ children }: { children: React.ReactNode }) {`

Path in repo: `components/app-bootstrap.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `app-bootstrap.tsx`.

## Libraries used

- **expo-font** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **@/contexts/app-language-context** (`{ useAppLanguage }`) – shared React context.
- **@/hooks/use-app-translation** (`{ useAppTranslation }`) – custom React hook.
- **@/lib/theme** (`{ Brand, FormColors }`) – shared library code.
- **@/lib/theme/arabic-script-fonts** (`{ ArabicScriptFont }`) – shared library code.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. React `useEffect` hooks run after render when dependencies change, coordinating subscriptions, fetches, or cleanup.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
