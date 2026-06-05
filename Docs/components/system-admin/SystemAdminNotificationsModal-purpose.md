<!-- purpose-doc: normalized -->
# SystemAdminNotificationsModal (`SystemAdminNotificationsModal.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export function SystemAdminNotificationsModal({ visible, onClose, isDarkMode }: Props) {`

Path in repo: `components/system-admin/SystemAdminNotificationsModal.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `SystemAdminNotificationsModal.tsx`.

## Libraries used

- **@expo/vector-icons** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **@/constants/brand** (`{ Brand }`) – shared constants.
- **@/contexts/system-admin-remote-context** (`{ useSystemAdminRemote }`) – shared React context.
- **@/hooks/use-app-translation** (`{ useAppTranslation }`) – custom React hook.
- **@/lib/api/system-admin** (`{ markAllSystemAdminNotificationsRead, markSystemAdminNotificationRead }`) – app API and data access helper.
- **@/lib/adapters/toast** (`{ showToast }`) – shared library code.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Primary UI for system administration features.
