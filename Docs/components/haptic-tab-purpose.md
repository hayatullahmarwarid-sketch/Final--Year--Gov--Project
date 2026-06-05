<!-- purpose-doc: normalized -->
# Haptic Tab (`haptic-tab.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export function HapticTab(props: BottomTabBarButtonProps) {`

Path in repo: `components/haptic-tab.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `haptic-tab.tsx`.

## Libraries used

- **@react-navigation/bottom-tabs** – third-party dependency for this module.
- **@react-navigation/elements** – third-party dependency for this module.
- **expo-haptics** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **@/lib/theme** (`{ androidRipple }`) – shared library code.

## Logic implemented

1. Render `PlatformPressable` from `@react-navigation/elements`, forwarding all tab bar button props.
2. On Android, enable ripple feedback using `androidRipple.primary` from the theme when `Platform.OS === 'android'`.
3. On `onPressIn`, when `process.env.EXPO_OS === 'ios'`, fire `Haptics.impactAsync` with light impact, then chain any existing `onPressIn` from props.
4. Parent tab navigators mount this component for each tab control so every tab press gets consistent tactile feedback on supported iOS builds.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
