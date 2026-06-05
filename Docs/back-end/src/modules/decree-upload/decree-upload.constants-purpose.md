<!-- purpose-doc: normalized -->
# Decree Upload Constants (`decree-upload.constants.js`)

## Scenario
When a department officer drafts a decree, the system can assess how “complete” the decree is—whether the required metadata fields are filled in and whether the latest version has the necessary content. This completeness score helps the officer see what’s missing before publishing. The module defines exactly which fields at the root level and at the version level are considered mandatory for a decree to be deemed complete.

## What it does
Exports two frozen arrays of field names:

- **`DECREE_COMPLETENESS_ROOT_KEYS`** – an array of strings listing the top‑level decree schema fields that must be present and non‑empty to count towards metadata completeness. Examples might include `title`, `categoryId`, `decreeNumber`, `effectiveFrom`, etc.
- **`DECREE_COMPLETENESS_VERSION_KEYS`** – an array of field names inside a decree version that count towards version completeness, such as `effectiveFrom`, `localizedContent` (as shown in the file’s snippet).

These constants are used by the completeness computation function in the service, keeping the list centralised and easy to update.

## Libraries used
- None – pure JavaScript arrays.

## Logic implemented
1. Define root keys in an array and freeze it.
2. Define version keys in an array and freeze it.
3. The service imports these arrays and iterates over them to check if each corresponding field on a decree/version object has a truthy value, incrementing a completeness percentage.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Decree upload department APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
