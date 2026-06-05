<!-- purpose-doc: normalized -->
# Exams (`exams.ts`)

## Scenario

Bundled or typed **data modules** are loaded when features need catalogues, stores, or model shapes shared across the app.

## What it does

The file exports the following surface (representative `export` lines):

- `export type ExamStatus = 'available' | 'upcoming' | 'completed';`
- `export type ExamListItem = {`
- `export type ExamFilterTab = 'all' | ExamStatus;`
- `export const EXAM_FILTER_TABS: { key: ExamFilterTab; label: string; dot: string }[] = [`
- `export function countExamsByFilter(exams: ExamListItem[], tab: ExamFilterTab): number {`

Path in repo: `data/exams.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `exams.ts`.

## Libraries used

- **@/constants/brand** (`{ Brand }`) – shared constants.
- **@/lib/theme** (`{ palette }`) – shared library code.

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
