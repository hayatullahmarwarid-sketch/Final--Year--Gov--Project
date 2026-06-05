<!-- purpose-doc: normalized -->
# PasswordStrengthBar (`PasswordStrengthBar.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export type PasswordStrength = 'none' | 'weak' | 'medium' | 'strong';`
- `export function scorePasswordStrength(password: string): PasswordStrength {`
- `export function PasswordStrengthBar({ strength }: PasswordStrengthBarProps) {`

Path in repo: `components/auth/PasswordStrengthBar.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `PasswordStrengthBar.tsx`.

## Libraries used

- **react** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **@/constants/form** (`{ FormColors }`) – shared constants.
- **@/hooks/use-app-translation** (`{ useAppTranslation }`) – custom React hook.
- **@/lib/validation/password-policy** (`{ isPasswordPolicyValid }`) – shared library code.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
