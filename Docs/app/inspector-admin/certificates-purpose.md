<!-- purpose-doc: normalized -->
# Inspector Admin Certificates Screen (`certificates.tsx`)

## Scenario
The admin needs to manage the certificates that inspectors receive after completing training or passing exams. From this screen, the admin can view all certificate definitions (e.g., “Inspector Level 1 Certificate”), toggle their active status, and perhaps assign them to inspectors or templates. Certificates can be grouped by kind (e.g., training, exam), and the admin can filter the list accordingly.

## What it does
The screen reads certificates data from `useInspectorAdminWorkspace`. It displays a list of certificates, each showing the certificate title, kind (as a `CertificateKindKey`), and an active/inactive status. The admin can tap a certificate to view details, or use inline actions to activate/deactivate or delete a certificate. `AppPressable` provides consistent tap feedback. All user‑facing text uses `useAppTranslation`, and `showToast` echoes the outcome of any mutation.

## Libraries used
- **@expo/vector-icons** – certificate icons, status indicators.
- **react** – core rendering.
- **@/components/ui/AppPressable** – standard pressable.
- **@/data/inspector-admin-store** – types `Certificate`, `CertificateKindKey`.
- **@/hooks/use-app-translation** – localised strings.
- **@/hooks/use-inspector-admin-workspace** – certificates data and CRUD.
- **@/lib/adapters/toast** (`showToast`) – feedback.

## Logic implemented
1. The workspace provides the current list of certificates (`workspace.certificates`). The screen may re‑fetch on mount or when focused.
2. Certificates are rendered in a list, grouped by kind or sorted by name.
3. Each certificate item shows:
   - Title.
   - Kind badge (e.g., “Exam”, “Training”).
   - Active/inactive indicator (perhaps a toggle or coloured badge).
4. **Toggle active status:**
   - The admin taps a switch/button; the screen calls `workspace.updateCertificate(id, { active: !current })`.
   - Toast confirms the change.
5. **Add new certificate:**
   - A “New Certificate” button opens a form (may be a modal or a separate screen) where the admin enters title, kind, and start date.
   - On creation, `workspace.createCertificate(payload)` is called, list refreshes.
6. Deletion works similarly with a confirmation dialog.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
