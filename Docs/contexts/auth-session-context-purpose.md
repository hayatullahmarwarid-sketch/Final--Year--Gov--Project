<!-- purpose-doc: normalized -->
# Auth Session Context (`auth-session-context.tsx`)

## Scenario

Global or subtree state is provided through React context. This module is active while its provider wraps part of the tree and consumers read or update that shared state.

## What it does

The file exports the following surface (representative `export` lines):

- `export type AuthSessionRole =`
- `export function AuthSessionProvider({ children }: { children: React.ReactNode }) {`
- `export function useAuthSession() {`

Path in repo: `contexts/auth-session-context.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `auth-session-context.tsx`.

## Libraries used

- **@react-native-async-storage/async-storage** – third-party dependency for this module.
- **expo-splash-screen** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **@/contexts/app-language-context** (`{ useAppLanguage }`) – shared React context.
- **@/lib/migrate-preauth-profile** (`{ migratePreauthProfileAndPasswordTo }`) – shared library code.
- **@/lib/api/auth-jwt** (`{ getBackendAuthMe }`) – app API and data access helper.
- **@/lib/api/jwt-session-storage** (`{ clearJwtTokens, getJwtAccessToken, getJwtRefreshToken, saveJwtTokens }`) – app API and data access helper.
- **@/lib/auth-backend-role-map** (`{ mapBackendRoleKeyToAuthSessionRole }`) – shared library code.
- **@/lib/language-backend-map** (`{ backendPreferredToAppLanguageId }`) – shared library code.

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
