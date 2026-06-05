<!-- purpose-doc: normalized -->
# Notifications Inbox Screen (`notifications.tsx`)

## Scenario
The user taps the notification bell icon (usually in the header) and arrives at the notifications inbox. Here they see a chronological list of all in‑app notifications—decree announcements, exam reminders, assignment changes, etc. Each notification row shows an icon, title, short description, and a timestamp. Tapping a notification navigates to the relevant detail screen (e.g., the decree, exam, or assignment). The screen also enables pull‑to‑refresh and marks notifications as read when viewed.

## What it does
The screen uses `useNotificationInbox` to access the list of `InboxNotification` items and actions like `markAsRead`. It also uses `usePublicUserData` to link the inbox to the current user. The list is rendered using `FlatList`. Each item renders according to its `NotificationCategory` (icon and colour). Tapping an item calls `markAsRead` and then navigates to a deep link contained in the notification data (e.g., `/decree/123`). The screen is guarded by `useRedirectNonPublicFromPublicRoutes`. Localised strings come from `useAppTranslation`.

## Libraries used
- **expo-router** – navigation to target screens.
- **expo-haptics** – haptic on tap.
- **expo-status-bar** – status bar.
- **@expo/vector-icons** – notification icons.
- **react** / **react-native-safe-area-context** – core.
- **@/constants/brand** / **@/constants/form** – colours.
- **@/hooks/use-app-translation** – translations.
- **@/contexts/notification-inbox-context** – inbox state and actions.
- **@/contexts/public-user-data-context** – user ID.
- **@/data/notifications-models** – types `InboxNotification`, `NotificationCategory`.
- **@/hooks/use-redirect-non-public-from-public-routes** – guard.

## Logic implemented
1. Guard verifies public user access.
2. On mount, the inbox fetches notifications from the backend (via the context).
3. The list is displayed, most recent first. Each item:
   - Icon determined by category (e.g., `decree` → gavel icon).
   - Title and body text.
   - Relative timestamp (e.g., “2 hours ago”).
   - Unread indicator (blue dot) if not read.
4. Pull‑to‑refresh triggers a re‑fetch.
5. Tapping a notification:
   - `markAsRead(notificationId)` updates the context and backend.
   - Haptic light impact.
   - Extract the `targetRoute` from notification data and `router.push(targetRoute)`.
6. Empty state shows “No notifications” message.
7. Status bar styled with brand colour.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
