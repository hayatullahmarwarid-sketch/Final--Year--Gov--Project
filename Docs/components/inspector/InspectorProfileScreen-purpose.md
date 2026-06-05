<!-- purpose-doc: normalized -->
# InspectorProfileScreen (`InspectorProfileScreen.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export function InspectorProfileScreen() {`

Path in repo: `components/inspector/InspectorProfileScreen.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `InspectorProfileScreen.tsx`.

## Libraries used

- **@expo/vector-icons** – third-party dependency for this module.
- **expo-router** – third-party dependency for this module.
- **expo-status-bar** – third-party dependency for this module.
- **expo-web-browser** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **react-native-safe-area-context** – third-party dependency for this module.
- **@/constants/brand** (`{ Brand }`) – shared constants.
- **@/contexts/auth-session-context** (`{ useAuthSession }`) – shared React context.
- **@/lib/api/inspectors** (`{ inspectorsApi }`) – app API and data access helper.
- **@/contexts/inspector-lang-context** (`{ useInspectorLang }`) – shared React context.
- **@/hooks/use-app-translation** (`{ useAppTranslation }`) – custom React hook.
- **./inspector-chrome** (`{ INSPECTOR_AVATAR_GOLD, INSPECTOR_BAR_BG, inspectorHeaderShadow }`) – relative project import.
- **./InspectorBottomNav** (`{ InspectorBottomNav, inspectorBottomNavOffset }`) – relative project import.
- **./inspector-translations** (`{ INSPECTOR_TRANSLATIONS }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. React `useEffect` hooks run after render when dependencies change, coordinating subscriptions, fetches, or cleanup.
3. Local component state is managed with React hooks and drives re-renders when updated.
4. Expo Router (`useRouter` or imperative navigation) changes the active screen based on user actions or completion of async work.
5. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
6. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
