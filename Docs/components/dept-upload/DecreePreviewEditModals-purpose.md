<!-- purpose-doc: normalized -->
# DecreePreviewEditModals (`DecreePreviewEditModals.tsx`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export type DecreePreviewModel = {`
- `export function buildPreviewModel(row: RecentUploadRow, decree: SerializedDecree | null): DecreePreviewModel {`
- `export function DecreePreviewModal({ visible, row, decree, loading, onClose, onEdit, onDownloaded }: PreviewProps) {`
- `export function EditDecreeModal({ visible, decree, row, categories, onClose, onSaved }: EditProps) {`

Path in repo: `components/dept-upload/DecreePreviewEditModals.tsx`. Together, these exports and any side effects at import time define how the rest of the project interacts with `DecreePreviewEditModals.tsx`.

## Libraries used

- **@expo/vector-icons** – third-party dependency for this module.
- **expo-print** – third-party dependency for this module.
- **expo-sharing** – third-party dependency for this module.
- **react** – third-party dependency for this module.
- **react-native-safe-area-context** – third-party dependency for this module.
- **@/components/ui/AppPressable** (`{ AppPressable }`) – UI component.
- **@/components/dept-upload/DeptUploadRecentUploadsCard** (`type { RecentUploadRow }`) – UI component.
- **@/constants/dept-upload-dashboard** (`{ DeptUploadDash }`) – shared constants.
- **@/contexts/app-language-context** (`{ useAppLanguage }`) – shared React context.
- **@/lib/decree-number-format** (`{ formatDecreeNumberLabel }`) – shared library code.
- **@/lib/theme** (`{ Brand, palette }`) – shared library code.
- **@/lib/adapters/toast** (`{ showToast }`) – shared library code.
- **@/lib/dept-upload/decree-pdf-download** (`{ buildDeptUploadDecreePdfHtml, decreePdfFilename, saveGeneratedPdfToDeviceStorage }`) – shared library code.

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
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
