<!-- purpose-doc: normalized -->
# Certificate Section Layout (`_layout.tsx`)

## Scenario
The certificate detail screen is nested inside the `certificate` route group. Before the user can view any certificate, the layout checks that they are authorised to access public‑facing content (i.e., they are logged in and have a valid public user identity). If the user is not recognised as a public user, they are immediately redirected away from the certificate section, preventing deep‑linked access to certificate details by unauthorised users.

## What it does
This layout wraps all screens under the `certificate` folder (primarily `[id].tsx`) with a redirection guard. It imports `useRedirectNonPublicFromPublicRoutes`, a custom hook that evaluates the current authentication and public‑user contexts. The hook automatically performs the redirect if the user is not authorised, typically sending them to the login screen or the home tab with an explanatory message. The layout itself renders nothing else—it simply renders its child `<Slot />` (the actual certificate detail screen) after the hook has run. Because it is an Expo Router layout file, it participates in deep linking; if a deep link targets `/certificate/some-id`, the guard will run before the screen is shown.

## Libraries used
- **expo-router** – provides the `<Stack>` or `<Slot>` navigation component and the file‑based routing context.
- **react** – renders the layout component.
- **@/hooks/use-redirect-non-public-from-public-routes** – performs the authentication check and redirect.

## Logic implemented
1. The `CertificateLayout` function is called by Expo Router whenever any screen inside the `certificate` folder is about to be rendered.
2. The hook `useRedirectNonPublicFromPublicRoutes()` is invoked. This hook typically:
   - Reads the authentication session from `useAuthSession`.
   - Reads the public user data from `usePublicUserData`.
   - If no session or no public user exists, it uses `expo-router`’s `router.replace` to navigate to a safe route (e.g., `/login` or `/`).
   - Optionally shows a toast explaining the restriction.
3. If the guard passes (user is valid), the hook returns `null` (no redirect).
4. The layout returns the `<Slot />` component, which renders the active child screen (`[id].tsx`).
5. Because this is a layout, any global loading states or transition animations can be added here later, but currently it only provides the redirect logic.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
