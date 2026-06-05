<!-- purpose-doc: normalized -->
# Verify Certificate Screen (`verify-certificate.tsx`)

## Scenario
A third party (employer, other agency) needs to verify the authenticity of a certificate by entering its unique reference number. This screen is open to the public (no login required). The user enters the certificate reference code, and the app calls a public API. On success, it displays the certificate details (name of the holder, title, date issued, status). On failure, shows a “Certificate not found” message.

## What it does
The screen uses `Brand` and `FormColors` for styling. It provides an input for the reference number, and a “Verify” button. On press, `verifyCertificateByRef(ref)` is called. The response contains certificate data (not typed via imports, but likely a `Certificate` type), which is displayed in a neat layout—holder name, exam name, issue date, and a validity indicator (e.g., “Valid”). It also may show a share button to copy the verification link. Translations are done with `useAppTranslation`. No redirect guard is needed because this is a public screen.

## Libraries used
- **expo-router** – navigation (maybe none, just route).
- **expo-status-bar** – status bar.
- **@expo/vector-icons** – badge/verified icon.
- **react** / **react-native-safe-area-context** – core.
- **@/constants/brand** / **@/constants/form** – tokens.
- **@/hooks/use-app-translation** – translations.
- **@/lib/api/certificates-public** – `verifyCertificateByRef` API.

## Logic implemented
1. Render a `TextInput` for the reference number.
2. On “Verify”:
   - Validate input not empty.
   - Call `verifyCertificateByRef(ref)`.
   - Show loading.
   - On result:
     - Display certificate details (holder, title, date, status).
     - If status is valid, show green “Verified” badge.
     - If invalid or not found, show a “Not found” message.
   - On error, show error toast.
3. No authentication required; the route is truly public.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
