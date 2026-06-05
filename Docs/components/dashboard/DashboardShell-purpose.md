<!-- purpose-doc: normalized -->
# DashboardShell (`DashboardShell.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export function DashboardShell({ role, titleOverride, hideTopBar, children }: Props) {`

Path in repo: `components/dashboard/DashboardShell.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `DashboardShell.tsx`.

## Libraries used

- **@expo/vector-icons** – third-party dependency for this module.
- **expo-router** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **react-native-safe-area-context** – third-party dependency for this module.
- **@/components/dept-upload/DeptUploadDrawer** (`{ DeptUploadDrawer }`) – UI component.
- **@/components/dept-upload/DeptUploadShellHeader** (`{ DeptUploadShellHeader }`) – UI component.
- **@/components/system-admin/SystemAdminNotificationsModal** (`{ SystemAdminNotificationsModal }`) – UI component.
- **@/components/ui/AppPressable** (`{ AppPressable }`) – UI component.
- **@/contexts/auth-session-context** (`type { AuthSessionRole }`) – shared React context.
- **@/contexts/auth-session-context** (`{ useAuthSession }`) – shared React context.
- **@/contexts/dept-upload-ui-context** (`{ useDeptUploadUiOptional }`) – shared React context.
- **@/contexts/system-admin-ui-context** (`{ useSystemAdminUiOptional }`) – shared React context.
- **@/data/system-admin-store** (`{ useSystemAdminStore }`) – project module.
- **@/hooks/use-app-translation** (`{ useAppTranslation }`) – custom React hook.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Local component state is managed with React hooks and drives re-renders when updated.
3. Expo Router (`useRouter` or imperative navigation) changes the active screen based on user actions or completion of async work.
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
