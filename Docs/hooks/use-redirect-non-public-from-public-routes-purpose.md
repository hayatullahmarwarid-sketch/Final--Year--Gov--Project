<!-- purpose-doc: normalized -->
# Use Redirect Non Public From Public Routes (`use-redirect-non-public-from-public-routes.ts`)

## Scenario

Multiple screens share behaviour through hooks. This hook runs when any consumer component mounts or when its dependencies change, encapsulating stateful logic.

## What it does

The file exports the following surface (representative `export` lines):

- `export function useRedirectNonPublicFromPublicRoutes() {`

Path in repo: `hooks/use-redirect-non-public-from-public-routes.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `use-redirect-non-public-from-public-routes.ts`.

## Libraries used

- **expo-router** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **@/contexts/auth-session-context** (`{ useAuthSession }`) – shared React context.
- **@/lib/auth-routing** (`{ homeHrefForRole }`) – shared library code.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. React `useEffect` hooks run after render when dependencies change, coordinating subscriptions, fetches, or cleanup.
3. Expo Router (`useRouter` or imperative navigation) changes the active screen based on user actions or completion of async work.
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
