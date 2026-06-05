<!-- purpose-doc: normalized -->
# Inspector Admin Store (`inspector-admin-store.ts`)

## Scenario

Bundled or typed **data modules** are loaded when features need catalogues, stores, or model shapes shared across the app.

## What it does

The file exports the following surface (representative `export` lines):

- `export { formatHeaderDate };`
- `export type InspectorTab =`
- `export interface TemplateField {`
- `export interface Template {`
- `export interface Assignment {`
- `export interface Submission {`
- `export interface Incident {`
- `export interface Question {`
- `export type ExamAudienceRole =`
- `export interface Exam {`
- `export interface ExamAttemptAnswer {`
- `export type CertificateKindKey =`
- `export interface Certificate {`
- `export interface FieldInspector {`
- `export interface ExamResult {`
- `export interface InspectorNotification {`
- `export interface InspectorAdminState {`
- `export interface DecreeOption {`
- … (17 additional export lines in file)

Path in repo: `data/inspector-admin-store.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `inspector-admin-store.ts`.

## Libraries used

- **@react-native-async-storage/async-storage** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **@/data/public-decrees-catalog** (`{ CATEGORIES }`) – project module.
- **@/data/system-admin-store** (`{ formatHeaderDate }`) – project module.

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
