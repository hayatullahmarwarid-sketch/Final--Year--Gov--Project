<!-- purpose-doc: normalized -->
# Department Upload Decrees Layout (`_layout.tsx`)

## Scenario
Within the department upload section of the app, the decree management screens (list and detail) are grouped under this layout. It sets up a stack navigator so that the user can move from the decree list to the decree detail and back with standard mobile navigation gestures and headers. The layout itself does not impose additional authentication or role checks; those are handled by higher‑level layouts or the parent department upload section.

## What it does
This layout is a minimal Expo Router stack layout. It imports `Stack` from `expo-router` and renders a stack navigator with two screens: `index` (the decree list) and `[id]` (the decree detail). Because no relative imports are detected, it does not inject any custom header components, translations, or guards—the screens inside inherit any outer protection already established by the broader department upload layout. The stack configuration may define default animation, title, and header style from the route’s own options.

## Libraries used
- **expo-router** – provides the `<Stack>` component and screen configurations.
- **react** – renders the layout.

## Logic implemented
1. The `DeptUploadDecreesLayout` function returns a `<Stack>` navigator.
2. `<Stack.Screen name="index" />` maps to the decree list screen.
3. `<Stack.Screen name="[id]" />` maps to the decree detail screen (dynamic route).
4. Default options (headerShown, animation) are set at the stack level; individual screens may override them through their own `options`.
5. There is no redirect logic or additional state, as the parent department upload layout already ensures the user is authorised to access this section.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
