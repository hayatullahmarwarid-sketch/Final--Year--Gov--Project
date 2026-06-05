<!-- purpose-doc: normalized -->
# Dept Upload Ui Context (`dept-upload-ui-context.tsx`)

## Scenario

Global or subtree state is provided through React context. This module is active while its provider wraps part of the tree and consumers read or update that shared state.

## What it does

The file exports the following surface (representative `export` lines):

- `export type DeptUploadThemeColors = {`
- `export function buildDeptUploadThemeColors(dark: boolean): DeptUploadThemeColors {`
- `export function DeptUploadUiProvider({ children }: { children: React.ReactNode }) {`
- `export function useDeptUploadUi(): Ctx {`
- `export function useDeptUploadUiOptional(): Ctx | null {`
- `export function useDeptUploadThemeColorsOptional(): DeptUploadThemeColors {`

Path in repo: `contexts/dept-upload-ui-context.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `dept-upload-ui-context.tsx`.

## Libraries used

- **react** – third-party dependency for this module.
- **@/constants/dept-upload-dashboard** (`{ DeptUploadDash }`) – shared constants.
- **@/lib/theme** (`{ Brand }`) – shared library code.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Local component state is managed with React hooks and drives re-renders when updated.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
