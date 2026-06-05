<!-- purpose-doc: normalized -->
# Tab Layout (`_layout.tsx`)

## Scenario
When a user opens the mobile app, they are first presented with a tab-based navigation shell. This layout is the root for all primary screens: Home, Decrees, Exams, and Profile. It guarantees that the user is authenticated before they can interact with any tab. If the session is invalid or expired, the user is automatically redirected to the login screen.

## What it does
The layout defines a bottom tab bar with four icons, each labeled in the user’s current language. Tapping a tab provides haptic feedback (on supported devices) using the `HapticTab` component, giving a subtle tactile response. The entire tab navigation is wrapped in a `DashboardShell` component that supplies a consistent header, status bar management, and any global UI chrome.

The tab bar itself is styled with a custom shadow and spacing drawn from the design tokens (`palette`, `shadowTabBar`, `spacing`). The `Brand` and `FormColors` tokens ensure that active/inactive tab colors align with the app’s branding. The layout also participates in Expo Router’s deep linking: any deep link that matches a tab route will open the app to that specific tab, provided the user is already authenticated.

## Libraries used
- **expo-router** – provides the `Tabs` component and file‑based routing.
- **@expo/vector-icons** – renders tab bar icons (e.g., Ionicons).
- **react** / **react-native** – core UI framework.
- **@/lib/theme** (Brand, FormColors, palette, shadowTabBar, spacing, typography) – design constants.
- **@/components/dashboard/DashboardShell** – wraps the tabs with a shared layout.
- **@/components/haptic-tab** – custom tab button that triggers haptics.
- **@/contexts/auth-session-context** – reads the current auth session; used to gate access.
- **@/hooks/use-app-translation** – provides translated labels for tab names.

## Logic implemented
1. On mount, the `useAuthSession` hook checks whether a valid token or user object exists.
2. If no session is present, the user is redirected to the login screen (`/login`).
3. If authenticated, the `DashboardShell` renders the `<Tabs>` component.
4. Each `<Tabs.Screen>` is mapped to a specific route (e.g., `index`, `decrees`, `exams`, `profile`).
5. The `tabBarButton` prop is replaced with `HapticTab`, so a press triggers a haptic event.
6. Tab labels are obtained from the `useAppTranslation` hook, supporting dynamic language changes.
7. Styles for the tab bar are computed from theme tokens (shadow, background color, border, spacing).

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
