<!-- purpose-doc: normalized -->

---

### `decree-version.serializer-purpose.md`
```markdown
# Decree Version Serializer (`decree-version.serializer.js`)

## Scenario
When a decree is updated, a new version is created. API consumers may need to list the versions (without the full body to reduce payload size) or view a specific version (with the full body). The serializer supports both use cases via an option `stripBodies`. When `stripBodies` is `true`, the lengthy text content is replaced by a short placeholder or omitted, keeping list responses light.

## What it does
Exports `serializeDecreeVersion(row, opts = {})`, where `opts` can contain `stripBodies` (boolean). It takes a version plain object and returns a formatted object including:
- `id`
- `decreeId`
- `versionNumber`
- `publication` status
- `body` – the full text content, unless `stripBodies` is true, in which case it may be replaced by an object like `{ truncated: true }` or omitted entirely.
- `author` (if populated) – serialized author summary (maybe from another serializer, though not imported here; it might just pass through the user ID and name).
- `createdAt`

## Libraries used
- None – pure JavaScript transformation.

## Logic implemented
1. Check if `row` is nullish, return `null`.
2. Build output:
   ```js
   const serialized = {
     id: row._id?.toString(),
     decreeId: row.decreeId?.toString(),
     versionNumber: row.versionNumber,
     publication: row.publication,
     createdAt: row.createdAt?.toISOString(),
   };

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Decree upload department APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
