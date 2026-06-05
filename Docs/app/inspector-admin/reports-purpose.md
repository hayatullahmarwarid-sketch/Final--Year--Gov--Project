<!-- purpose-doc: normalized -->
# Inspector Admin Reports Screen (`reports.tsx`)

## Scenario
The admin needs to generate reports for higher management or for their own records. This screen offers several report types (e.g., “Inspector Performance,” “Compliance by Category,” “Submission Status”). The admin selects a report type and a date range, then taps “Generate Report.” The screen also allows exporting the generated report as a CSV file, which is saved to the device storage and can be shared.

## What it does
The screen uses `inspectorAdminApi` to fetch report data based on selected parameters. The UI likely has dropdowns or date pickers to choose the report type and time period. After generation, a preview of the report might be displayed (e.g., a table). A “Download CSV” button triggers `saveCsvToDeviceStorage`, which converts the report data to CSV format, writes it to the device, and optionally opens the share sheet. All actions produce toasts via `showToast`. The screen also uses `useInspectorAdminWorkspace` for any contextual data it needs. `AppPressable` is used for the generate and download buttons.

## Libraries used
- **@expo/vector-icons** – download, report icons.
- **react** / **react-native** – core UI.
- **@/components/ui/AppPressable** – pressable buttons.
- **@/hooks/use-app-translation** – localised labels.
- **@/hooks/use-inspector-admin-workspace** – workspace data.
- **@/lib/adapters/toast** (`showToast`) – feedback.
- **@/lib/api/inspector-admin** (`inspectorAdminApi`) – fetches report data.
- **@/lib/inspector-admin/reports-csv-download** (`saveCsvToDeviceStorage`) – exports CSV.

## Logic implemented
1. The screen renders a form with:
   - A report type picker (e.g., “Inspector Performance”, “Category Compliance”).
   - Date range inputs (from/to).
   - A “Generate” button.
2. On press “Generate”, `inspectorAdminApi.generateReport(type, from, to)` is called.
3. Loading indicator appears; on success, the report data is stored in state and displayed as a `FlatList` or table.
4. **Download CSV:**
   - Button “Download CSV” calls `saveCsvToDeviceStorage(data, filename)`.
   - This function creates the CSV file and triggers a share sheet or saves to the device’s documents.
   - A toast “Report saved” is shown; on error, an error toast.
5. The screen may also allow copying the raw data to clipboard (if `expo-clipboard` were imported, but it’s not here; still possible through the download function).
6. The UI is translated and uses `AppPressable` for all buttons.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
