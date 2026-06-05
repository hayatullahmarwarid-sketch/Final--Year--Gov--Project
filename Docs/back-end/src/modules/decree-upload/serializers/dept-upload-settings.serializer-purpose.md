<!-- purpose-doc: normalized -->

---

### `dept-upload-settings.serializer-purpose.md`
```markdown
# Department Upload Settings Serializer (`dept-upload-settings.serializer.js`)

## Scenario
Each department that uses the decree upload module can customise its settings—notification types, default category, auto‑publish, and more. When the API returns these settings (to the department’s admin), the internal key‑value structure must be transformed into a more usable object or kept as a simple key‑value map. The serializer ensures that only the relevant settings are exposed and that any sensitive defaults are handled.

## What it does
Exports `serializeDeptUploadSettings(doc)`, which takes a settings document (or lean object) and returns a serialized representation. Since no other serializers are imported, it likely maps the document directly: either keeping the `key`/`value` pairs as an array, or converting them into a flat object where each key is a setting name. For example, the database might store multiple documents (one per setting), and the serializer might reduce them into a single object like `{ autoPublish: true, notifyOnUpload: false, defaultCategoryId: '...' }`. The comment indicates the input may be null/undefined, so it handles that gracefully.

## Libraries used
- None – pure JavaScript transformation.

## Logic implemented
1. If `doc` is nullish, return `null`.
2. If `doc` is an array (i.e., an array of settings records), reduce it into an object keyed by `doc.key` and valued by `doc.value` (after any required type coercion from strings).
3. If `doc` is a single document, extract its `key` and `value`.
4. Return the resulting object (or the raw value if it’s a single key query).
5. No sensitive fields (like `tenantId`) are included.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Decree upload department APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
