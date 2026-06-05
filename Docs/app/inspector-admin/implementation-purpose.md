<!-- purpose-doc: normalized -->
# Inspector Admin Implementation Screen (`implementation.tsx`)

## Scenario
The admin needs to track the implementation of inspection findings across quarters. This screen displays a quarterly breakdown of inspection completions, pending actions, and compliance rates. Each quarter is presented as a card summarising the numbers. The admin can also download a comprehensive “National Implementation Matrix” PDF for reporting to higher authorities, and copy key identifiers to the clipboard for use in other systems.

## What it does
The component fetches implementation data using `inspectorAdminApi` (likely `getImplementationData()` or similar). It renders a list of `QuarterlyImplementationCard` components, one per quarter. Each card shows aggregated statistics such as total inspections, completed, pending, and compliance percentage. The screen also offers a button to download the national implementation matrix: `downloadNationalImplementationMatrixPdf` generates the PDF and opens the share sheet. Additionally, `expo-clipboard` is used to copy certain reference numbers or summary text when the admin long‑presses a card or taps a copy icon. All actions provide toasts via `showToast`, and the UI is translated with `useAppTranslation`.

## Libraries used
- **expo-router** – possible navigation to detail screens; not directly used in imports but likely available.
- **expo-clipboard** – copies implementation data to the clipboard.
- **@expo/vector-icons** – download and copy icons.
- **react** / **react-native** – core UI.
- **@/components/inspector-admin/QuarterlyImplementationCard** – displays a single quarter’s stats.
- **@/components/ui/AppPressable** – pressable elements.
- **@/hooks/use-app-translation** – localised text (“Implementation”, “Download Matrix”, “Copied”).
- **@/hooks/use-inspector-admin-workspace** – additional workspace data if needed.
- **@/lib/adapters/toast** (`showToast`) – feedback.
- **@/lib/api/inspector-admin** (`inspectorAdminApi`) – fetches implementation data.
- **@/lib/inspector-admin/tracking-report-download** (`downloadNationalImplementationMatrixPdf`) – generates and shares the PDF.

## Logic implemented
1. On mount, the screen calls `inspectorAdminApi.getImplementationData()` to load quarterly data.
2. While loading, a spinner is shown.
3. On success, the data is mapped to an array of quarter objects and rendered as `QuarterlyImplementationCard` components inside a `ScrollView`.
4. Each card displays: quarter name, total inspections, completed, pending, compliance %.
5. **Download PDF:**
   - Tapping “Download National Implementation Matrix” calls `downloadNationalImplementationMatrixPdf()`, which may fetch additional data, generate the PDF, and open the share sheet.
   - On success, a toast “Download started”; on error, a failure toast.
6. **Copy to clipboard:**
   - Long‑pressing a card or tapping a copy icon calls `Clipboard.setStringAsync(selectedData)` and shows “Copied” toast.
7. Workspace data might also be used to refresh the implementation numbers if a re‑fetch is needed.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
