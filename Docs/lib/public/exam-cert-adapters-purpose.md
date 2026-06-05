<!-- purpose-doc: normalized -->
# Exam Cert Adapters (`exam-cert-adapters.ts`)

## Scenario

Shared **library** code runs wherever imported—typically during screen render, event handlers, or background sync—to centralise formatting, storage, or cross-cutting behaviour.

## What it does

The file exports the following surface (representative `export` lines):

- `export function apiExamSummaryToListItem(row: Record<string, unknown>): ExamListItem {`
- `export function mergeExamCatalogWithResults(`
- `export function resultsRowsToScoreMap(items: Record<string, unknown>[]): Map<string, { scorePct: number }> {`
- `export function apiCertificateToListItem(row: Record<string, unknown>): CertificateListItem {`

Path in repo: `lib/public/exam-cert-adapters.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `exam-cert-adapters.ts`.

## Libraries used

- **@/data/certificates** (`type { CertificateLevel, CertificateListItem }`) – project module.
- **@/data/exams** (`type { ExamListItem, ExamStatus }`) – project module.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
