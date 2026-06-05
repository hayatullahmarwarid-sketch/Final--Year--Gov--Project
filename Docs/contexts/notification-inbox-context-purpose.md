<!-- purpose-doc: normalized -->
# Notification Inbox Context (`notification-inbox-context.tsx`)

## Scenario

Global or subtree state is provided through React context. This module is active while its provider wraps part of the tree and consumers read or update that shared state.

## What it does

The file exports the following surface (representative `export` lines):

- `export function NotificationInboxProvider({ children }: { children: React.ReactNode }) {`
- `export function useNotificationInbox() {`

Path in repo: `contexts/notification-inbox-context.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `notification-inbox-context.tsx`.

## Libraries used

- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **@/contexts/auth-session-context** (`{ useAuthSession }`) – shared React context.
- **@/data/notifications-models** (`type { InboxNotification }`) – project module.
- **@/lib/adapters/toast** (`{ showToast }`) – shared library code.
- **@/lib/api/jwt-session-storage** (`{ getJwtAccessToken }`) – app API and data access helper.
- **@/lib/i18n/init** (`i18n`) – shared library code.
- **@/lib/public/notification-inbox-adapter** (`{ apiInboxRowToInboxNotification }`) – shared library code.
- **@/hooks/use-app-translation** (`{ useAppTranslation }`) – custom React hook.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. React `useEffect` hooks run after render when dependencies change, coordinating subscriptions, fetches, or cleanup.
3. Local component state is managed with React hooks and drives re-renders when updated.
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
