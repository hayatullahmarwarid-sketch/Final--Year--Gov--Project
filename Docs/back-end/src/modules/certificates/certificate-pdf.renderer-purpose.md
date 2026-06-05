<!-- purpose-doc: normalized -->
# Certificate PDF Renderer (`certificate-pdf.renderer.js`)

## Scenario
The system needs to produce a professional, branded PDF certificate that includes the holder’s name, exam/training title, date, and a QR code containing a verification link. This module encapsulates the layout, styling, and rendering logic so that any part of the application can request a certificate PDF without worrying about PDF generation details.

## What it does
Exports `renderCertificatePdf(input)`, an async function that receives an object with:
- `user` (display name, maybe additional info)
- `exam` (or `training`) – title, category
- `certificate` (reference, issue date)
- `verifyToken` – the token to embed in the QR code

It uses `pdfkit` to create a PDF document, draws the certificate layout (borders, logos, text fields), and generates a QR code using `qrcode` (which is rendered as an image in the PDF). The QR code encodes a URL like `https://app.example/verify-certificate?token=VERIFY_TOKEN`. The function returns the PDF as a Buffer when the PDF stream is finished. No project imports are detected; all dependencies are external libraries.

## Libraries used
- **pdfkit** – generates the PDF document, providing methods for text, images, paths, and fonts.
- **qrcode** – generates a QR code data URL or buffer that can be embedded in the PDF.

## Logic implemented
1. Creates a new `PDFDocument` with appropriate page size (e.g., landscape A4).
2. Sets up fonts (may use standard or embedded fonts).
3. Draws a decorative border and a logo (if included).
4. Writes the certificate title, e.g., “Certificate of Completion”.
5. Writes the holder’s name (`user.fullName`).
6. Writes the exam/training title and category.
7. Writes the issue date and certificate reference number.
8. Generates a QR code with `qrcode.toDataURL(url)` (where `url = \`${baseUrl}/verify?token=${verifyToken}\``).
9. Embeds the QR code image in the PDF at a specific position and size.
10. Returns a Promise that resolves with the complete PDF Buffer after the stream end event.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
