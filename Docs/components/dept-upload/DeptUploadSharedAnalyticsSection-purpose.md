<!-- purpose-doc: normalized -->
# DeptUploadSharedAnalyticsSection (`DeptUploadSharedAnalyticsSection.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export type DeptUploadAnalyticsLayout = 'dashboard' | 'reports';`
- `export function DeptUploadSharedAnalyticsSection({ layout, dashboard }: Props) {`

Path in repo: `components/dept-upload/DeptUploadSharedAnalyticsSection.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `DeptUploadSharedAnalyticsSection.tsx`.

## Libraries used

- **react** – third-party dependency for this module.
- **@/components/dept-upload/DecreeDetailsModal** (`{ DecreeDetailsModal }`) – UI component.
- **@/components/dept-upload/DeptUploadMostViewedCard** (`type { MostViewedBarRow }`) – UI component.
- **@/components/dept-upload/DeptUploadMostViewedCard** (`{ DeptUploadMostViewedCard }`) – UI component.
- **@/components/dept-upload/MonthlyStatsModal** (`{ MonthlyStatsModal, type MonthlyStatsDetail }`) – UI component.
- **@/components/dept-upload/DeptUploadViewsOverTimeCard** (`{ DeptUploadViewsOverTimeCard }`) – UI component.
- **@/lib/api/decree-upload** (`type { DecreeUploadDashboardDto }`) – app API and data access helper.
- **@/lib/decree-number-format** (`{ formatDecreeNumberLabel }`) – shared library code.

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
