<!-- purpose-doc: normalized -->
# Decree Serializer (`decree.serializer.js`)

## Scenario
When the API returns a decree—whether in a list or a detail view—the internal database object must be transformed into a client‑friendly shape. This includes formatting the decree number (e.g., “Decree No. 42/1402”), nesting the associated category and version, and attaching any additional embed data (like view counts or user‑specific bookmark status). The serializer ensures that every decree endpoint returns the same structure.

## What it does
Exports two functions:

- **`buildDecreeNumberLabel(decree)`** – takes a decree object and returns a formatted, human‑readable label for its number. This may combine fields like `year`, `sequence`, and `category` into a string such as “Decree No. 42/1402”.
- **`serializeDecree(decree, embed = {})`** – takes a decree plain object (from the database) and an optional `embed` object with extra data to merge (like `bookmarked`, `viewCount`). It returns a JSON‑ready object that typically includes:
  - `id` (from `_id`)
  - `title`, `body` (or summary if full body is not needed)
  - `decreeNumber` (via `buildDecreeNumberLabel`)
  - `lifecycle`, `publishedAt`, `createdAt`, `updatedAt`
  - `category` – serialized using `serializeDecreeCategory` (if populated)
  - `versions` – an array of serialized decree versions (optionally stripped of bodies) using `serializeDecreeVersion`
  - Any additional `embed` fields merged in

## Libraries used
- **./decree-category.serializer.js** – `serializeDecreeCategory` to format the decree’s category.
- **./decree-version.serializer.js** – `serializeDecreeVersion` to format version history.

## Logic implemented
1. `buildDecreeNumberLabel` extracts fields like `decreeNumber`, `category`, `year` and formats them, e.g., `return \`Decree No. ${decree.decreeNumber}\`;`.
2. `serializeDecree`:
   - Creates a base object with mapped fields (`id`, `title`, `body`, `lifecycle`, etc.).
   - Formats dates with `.toISOString()`.
   - If `decree.category` is populated, calls `serializeDecreeCategory(decree.category)`.
   - If `decree.versions` is provided, maps each version through `serializeDecreeVersion(version, { stripBodies: true })` for list efficiency.
   - Spreads the `embed` object into the result to add transient fields like `isBookmarked`.
   - Returns the final object.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Decree upload department APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
