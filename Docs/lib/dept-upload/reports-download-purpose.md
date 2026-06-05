<!-- purpose-doc: normalized -->
# Reports Download (`reports-download.ts`)

## Scenario

Shared **library** code runs wherever imported—typically during screen render, event handlers, or background sync—to centralise formatting, storage, or cross-cutting behaviour.

## What it does

The file exports the following surface (representative `export` lines):

- `export type DeptUploadReportFormat = 'pdf' | 'csv' | 'excel';`
- `export async function downloadDeptUploadAnalyticsReport(format: DeptUploadReportFormat): Promise<`

Path in repo: `lib/dept-upload/reports-download.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `reports-download.ts`.

## Libraries used

- **expo-print** – third-party dependency for this module.
- **@/lib/api/decree-upload** (`{ getDecreeUploadDashboard, type DecreeUploadDashboardDto }`) – app API and data access helper.
- **@/lib/adapters/toast** (`{ showToast }`) – shared library code.
- **@/lib/dept-upload/reports-file-save** (`{ savePdfFileToDeviceStorage, saveTextFileToDeviceStorage }`) – shared library code.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
