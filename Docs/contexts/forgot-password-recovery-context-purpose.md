<!-- purpose-doc: normalized -->
# Forgot Password Recovery Context (`forgot-password-recovery-context.tsx`)

## Scenario

Global or subtree state is provided through React context. This module is active while its provider wraps part of the tree and consumers read or update that shared state.

## What it does

The file exports the following surface (representative `export` lines):

- `export type PendingPasswordReset = { email: string; token: string };`
- `export function ForgotPasswordRecoveryProvider({ children }: { children: React.ReactNode }) {`
- `export function useForgotPasswordRecovery() {`

Path in repo: `contexts/forgot-password-recovery-context.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `forgot-password-recovery-context.tsx`.

## Libraries used

- **react** – third-party dependency for this module.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. React `useEffect` hooks run after render when dependencies change, coordinating subscriptions, fetches, or cleanup.
3. Local component state is managed with React hooks and drives re-renders when updated.
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
