<!-- purpose-doc: normalized -->
# Use Reduced Motion (`use-reduced-motion.ts`)

## Scenario

Multiple screens share behaviour through hooks. This hook runs when any consumer component mounts or when its dependencies change, encapsulating stateful logic.

## What it does

The file exports the following surface (representative `export` lines):

- `export function useReducedMotion(): boolean {`

Path in repo: `hooks/use-reduced-motion.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `use-reduced-motion.ts`.

## Libraries used

- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.

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
