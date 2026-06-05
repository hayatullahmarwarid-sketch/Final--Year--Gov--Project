<!-- purpose-doc: normalized -->
# Decree PDF Download (`decree-pdf-download.ts`)

## Scenario

Department staff generate a printable/readable PDF snapshot of a decree they manage inside the upload portal (Expo screens under `app/dept-upload/`). The module builds HTML for printing and saves `expo-print` output into accessible storage on Android, iOS, or web.

## What it does

Exports helpers that:

- Build a standalone HTML document string from a `SerializedDecree` (`buildDeptUploadDecreePdfHtml`).
- Produce a filesystem-safe `.pdf` filename (`decreePdfFilename`).
- Copy a locally rendered PDF (`expo-print` output URI) into user-visible storage or trigger a browser download (`saveGeneratedPdfToDeviceStorage`).

## Libraries used

- **`Directory`, `File`, `Paths`** (`expo-file-system`) — Choose writable directories (`Paths.document` fallback `Paths.cache`) and represent destination files.
- **`EncodingType`, `readAsStringAsync`, `StorageAccessFramework`, `writeAsStringAsync`** (`expo-file-system/legacy`) — Base64 round-trip for copying buffers between URIs; Android SAF helpers for folder/file creation.
- **`Platform`** (`react-native`) — Branch Android vs iOS vs web for save behaviour.
- **`SerializedDecree`** type (`@/lib/api/decree-upload`) — Typed decree payload coming from department APIs.
- **`storage`** (`@/lib/adapters/storage`) — AsyncStorage-backed memo for the Android SAF directory URI (`ANDROID_DECREE_PDF_DIR_URI_KEY`).
- **`formatDecreeNumberLabel`** (`@/lib/decree-number-format`) — Human-readable decree numbers for titles and filenames.

## Logic implemented

### `buildDeptUploadDecreePdfHtml`

1. Derive metadata (category pill, ISO date from `updatedAt`/`createdAt`, summary text from metadata description or draft change summary).
2. Pick localized title/body via `bestContentLocale` / `decreeBodyText`, preferring Pashto/Dari/English blocks from `currentPublishedVersion` or `activeDraftVersion`.
3. Escape plain text for HTML (`escapeHtml`), convert newlines to `<br/>`, assemble `<style>` + card layout, return full HTML string.

### `decreePdfFilename`

1. Build a basename from `decree-${formatDecreeNumberLabel(d)}`, sanitize with `safeBasename`, append `.pdf` when missing.

### `saveGeneratedPdfToDeviceStorage`

1. Normalize filename with `safeBasename` and enforce `.pdf` extension.
2. **Web**: `fetch` the local URI to a `Blob`, create an object URL, synthesize `<a download>` click, revoke URL later; return `{ savedUri: filename, userVisible: true }`.
3. **Native**: copy source PDF into app-managed `File` under `directoryForWrite()` using base64 read/write.
4. **Android**: attempt `copyLocalFileToAndroidDirectory` — request SAF permission once (`ensureAndroidDecreePdfDirUri`), persist granted URI in `storage`, create file via `StorageAccessFramework.createFileAsync`, base64-copy contents; if SAF succeeds return user-visible path metadata, else fall back to internal URI with `userVisible: false`.
5. **iOS**: return internal document URI (`userVisible: false`; sharing handled elsewhere).

## Roles

- **public** — None (department tooling).
- **inspector** — None.
- **inspector_admin** — None.
- **decree_upload_department** — Direct: PDF export path for decree workspace UI.
- **system_admin** — None unless UI is reused.
