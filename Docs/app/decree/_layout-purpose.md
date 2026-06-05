<!-- purpose-doc: normalized -->
# Decree Section Layout (`_layout.tsx`)

## Scenario
The decree detail screen lives under the `decree` route group. Before the user can view any decree, the layout checks that they are authorised to access public‑facing content (i.e., they are logged in and have a valid public user identity). If a non‑public user tries to access a deep link like `/decree/abc123`, they are immediately redirected away from the decree section to a safe route, such as the login screen or the home tab.

## What it does
This layout wraps all screens inside the `decree` folder (currently `[id].tsx`) with an authentication guard. It imports the custom hook `useRedirectNonPublicFromPublicRoutes`, which evaluates the current authentication session and public user data. The hook automatically performs a redirect if the user is not authorised, ensuring that no decree detail screen is ever exposed to an unauthenticated user. The layout itself does not add any UI chrome—it merely renders the `<Slot />` (the child screen) once the guard passes. As an Expo Router layout file, it participates in deep linking: any incoming deep link to `/decree/some-id` will first trigger this guard before displaying the content.

## Libraries used
- **expo-router** – provides the `<Stack>` or `<Slot>` component and the file‑based routing context.
- **react** – renders the layout component.
- **@/hooks/use-redirect-non-public-from-public-routes** – performs the authentication and public‑user check, then redirects if necessary.

## Logic implemented
1. `DecreeStackLayout` is invoked when any screen under `app/decree` is about to appear.
2. The hook `useRedirectNonPublicFromPublicRoutes()` is called. Internally it:
   - Reads the auth session (from `useAuthSession`).
   - Reads the public user data (from `usePublicUserData`).
   - If either is missing, it uses `router.replace('/login')` (or another appropriate route) to redirect the user.
   - May display a toast explaining why access was denied.
3. If the user is valid, the hook finishes without redirecting.
4. The layout returns `<Slot />`, which renders the active child screen (`[id].tsx`).
5. The guard runs on every navigation event, so even if the user’s session expires while they are on the decree screen, they will be redirected on the next interaction.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
