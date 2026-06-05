<!-- purpose-doc: normalized -->
# Inspector Login Redirect Screen (`inspector-login.tsx`)

## Scenario
A deep link or a specific navigation target brings the app to `/inspector-login`. This screen exists solely to redirect the user to the appropriate login flow for field inspectors. It may capture a token from a QR code or a magic link and then forward the user to the inspector dashboard or the login screen with the inspector role pre‑selected.

## What it does
The component imports no project‑internal modules, suggesting it only uses `expo-router`’s `useLocalSearchParams` or `useGlobalSearchParams` to inspect query parameters and then perform a `router.replace`. The exact logic is not visible from imports, but typical behaviour is: check for a token or an email parameter, if present, pass it to the login screen as a parameter; otherwise, simply redirect to `/login` with a hint to show the inspector login form. No UI is rendered.

## Libraries used
- **expo-router** – route handling and redirect.
- **react** – minimal component.

## Logic implemented
1. The component reads the route params (e.g., `token`, `email`, `mode`).
2. If a token exists, it might call an API (not imported; but could be done via global providers) to exchange it for a session and then redirect to inspector home.
3. If no token, it redirects to `/login?role=inspector` or simply `/login`.
4. It renders nothing while the redirect is happening (possibly `null`).

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
