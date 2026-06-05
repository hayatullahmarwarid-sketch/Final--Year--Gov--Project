<!-- purpose-doc: normalized -->
# AdminSettingsNative (`AdminSettingsNative.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export function AdminSettingsNative() {`

Path in repo: `components/system-admin/AdminSettingsNative.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `AdminSettingsNative.tsx`.

## Libraries used

- **@expo/vector-icons** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **react-native-toast-message** – third-party dependency for this module.
- **@/components/ui/AppPressable** (`{ AppPressable }`) – UI component.
- **@/components/ui/AppSwitch** (`{ AppSwitch }`) – UI component.
- **@/contexts/system-admin-ui-context** (`{ useSystemAdminUiOptional }`) – shared React context.
- **@/hooks/use-app-translation** (`{ useAppTranslation }`) – custom React hook.
- **@/data/system-admin-store** (`{ useSystemAdminStore }`) – project module.
- **@/constants/api** (`{ getApiBaseUrl }`) – shared constants.
- **@/lib/api/jwt-session-storage** (`{ getJwtAccessToken }`) – app API and data access helper.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. React `useEffect` hooks run after render when dependencies change, coordinating subscriptions, fetches, or cleanup.
3. Local component state is managed with React hooks and drives re-renders when updated.
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Primary UI for system administration features.
