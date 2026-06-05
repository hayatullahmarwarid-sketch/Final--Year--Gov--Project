<!-- purpose-doc: normalized -->
# Mongoose Document Serializer (`to-plain.js`)

## Scenario
API responses must never leak Mongoose internals like `_id` (in its ObjectId form), `__v` (version key), or passwords. Controllers or services often call Mongoose’s `.toObject()` or use `lean()` to get plain objects, but they still contain unwanted fields. Instead of manually deleting fields in every response, this utility provides a consistent, recursive transformation that strips internal fields and returns a clean JSON‑ready object, suitable for `res.json()` or DTO serialization.

## What it does
Exports a function `toPlain(value, options)` that takes a Mongoose document, a lean object, or an array of such items, and:

1. Converts any Mongoose document to a plain object (via `.toObject()` or by spreading the lean object).
2. Removes a configurable set of field names (default: typical Mongoose internals like `__v`, `password`, maybe `_id` depending on options). The `options.strip` array can override which fields to strip.
3. Recursively processes nested objects and arrays, applying the same stripping rules at every level.
4. Returns the cleaned object(s), ready for JSON serialization.

It does not import any libraries—only standard JavaScript operations.

## Libraries used
- No external libraries; uses native JavaScript (Object.keys, Array.isArray, recursion).

## Logic implemented
1. If `value` is `null` or a primitive, it is returned as‑is.
2. If `value` is an array, it maps each element through `toPlain` recursively.
3. If `value` is a Mongoose document (likely detected via `value.constructor.name === 'model'` or `value._doc`), it extracts the plain object (`value.toObject()` or `value._doc`).
4. For an object, it creates a shallow copy (or operates directly if not mutating original) and iterates over its keys.
5. For each key in the `strip` list (default list like `['__v', 'passwordHash', ...]`), it deletes that key from the copy.
6. For remaining keys, if the value is an object or array, it recursively calls `toPlain` on it.
7. The cleaned copy is returned.
8. This ensures no internal fields accidentally reach the API consumer.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
