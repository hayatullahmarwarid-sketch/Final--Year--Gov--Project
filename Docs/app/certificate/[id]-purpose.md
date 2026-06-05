<!-- purpose-doc: normalized -->
# Certificate Detail Screen (`[id].tsx`)

## Scenario
A user taps on a certificate card from the Certificates tab and is taken to this full‑detail view. The screen displays the certificate’s complete information—title, issuing authority, date, and any other metadata—with a tailored visual theme. The user can generate a PDF of the certificate, save it to their device, or share it directly using the native share sheet.

## What it does
The component extracts the certificate `id` from the route parameter, then calls `getPublicCertificateById` to fetch the full record. The API response is adapted to a `CertificateListItem` via `apiCertificateToListItem`. The screen renders the certificate’s data using a styled layout defined by `CERT_DETAIL_THEME`, with colors drawn from the brand and form tokens. Two action buttons are available: **Save PDF** and **Share**. Tapping **Save PDF** triggers `saveCertificatePdfToDevice`, which builds the PDF using `buildCertificatePdfHtml` and `expo-print`, then writes the file to the device’s file system and shows a success toast. Tapping **Share** similarly generates the PDF but then opens `expo-sharing` to allow sharing via any available app (messaging, email, cloud storage). The screen also respects the logged‑in user’s profile context (via `useUserProfile`) to possibly personalize the certificate display (e.g., showing the user’s own name).

## Libraries used
- **expo-router** – retrieves the dynamic `[id]` parameter and handles navigation.
- **expo-print** – generates the PDF from the HTML template returned by `buildCertificatePdfHtml`.
- **expo-sharing** – provides the native share dialog for the generated PDF.
- **expo-status-bar** – manages the status bar appearance.
- **@expo/vector-icons** – renders icons for buttons and detail fields.
- **react** / **react-native-safe-area-context** – core UI and safe‑area handling.
- **@/constants/brand**, **@/constants/form**, **@/constants/home** – design tokens for colors.
- **@/data/certificate-detail-theme** (`CERT_DETAIL_THEME`) – pre‑defined styling constants (fonts, spacing, backgrounds) specific to certificate details.
- **@/data/certificates** – TypeScript type `CertificateListItem`.
- **@/contexts/user-profile-context** – provides the user’s profile (e.g., full name) that may be embedded in the certificate or used for personalization.
- **@/hooks/use-app-translation** – localized labels (“Save PDF”, “Share”, error messages).
- **@/lib/certificate-html** (`buildCertificatePdfHtml`) – constructs the complete HTML string for the PDF from the certificate data.
- **@/lib/certificate-pdf-save** (`certificatePdfFilename`, `saveCertificatePdfToDevice`) – generates a suitable filename and handles writing the PDF to local storage.
- **@/lib/api/public-user** (`getPublicCertificateById`) – fetches the certificate by ID from the backend.
- **@/lib/public/exam-cert-adapters** (`apiCertificateToListItem`) – adapter from raw API shape to `CertificateListItem`.

## Logic implemented
1. On mount, the component reads the `id` from `useLocalSearchParams()` (or `useGlobalSearchParams()`).
2. It calls `getPublicCertificateById(id)` to fetch the certificate data. While loading, a spinner or placeholder is shown.
3. On success, the raw data is transformed using `apiCertificateToListItem` into a `CertificateListItem` object.
4. The certificate details are rendered in a scrollable container styled according to `CERT_DETAIL_THEME`.
5. The user’s profile name (from `useUserProfile`) is merged into the display if the certificate is personal.
6. **Save PDF action:**
   - Builds HTML via `buildCertificatePdfHtml(certificate)`
   - Generates the PDF with `Print.printToFileAsync({ html, ... })`
   - Saves the resulting file with `saveCertificatePdfToDevice(uri, filename)`
   - Shows a confirmation toast.
7. **Share action:**
   - Builds and prints the PDF as above.
   - Calls `Sharing.shareAsync(uri)` to open the share sheet.
8. Any error during fetch, PDF generation, or save/share is caught and displayed as an alert or toast.
9. The screen uses `expo-status-bar` to ensure the status bar matches the certificate theme.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
