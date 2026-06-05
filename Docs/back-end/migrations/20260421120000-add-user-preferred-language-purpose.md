<!-- purpose-doc: normalized -->
# One‑Shot Migration – Set Default Preferred Language (`20260421120000-add-user-preferred-language.mjs`)

## Scenario
The user model has been extended with a `preferredLanguage` field to support multi‑lingual UI. However, existing users who were created before this field existed may have `null` or missing values for `preferredLanguage`. To ensure every user has a valid language preference (so the mobile app doesn’t show a blank language selection), this one‑shot script updates all legacy users, assigning them a sensible default language (e.g., English or the system’s fallback locale). It is designed to be run manually once per environment, directly from the command line.

## What it does
This is a standalone Node.js script (not part of the automated migration runner). It:

1. Loads environment variables (likely via `dotenv` or from the shell) to obtain the `MONGODB_URI`.
2. Connects to MongoDB using Mongoose.
3. Defines or retrieves the `User` model (using `mongoose.model('User')`).
4. Performs a bulk update to set `preferredLanguage` on all user documents where the field is missing, `null`, or perhaps empty.
5. Logs the number of updated documents.
6. Disconnects from MongoDB and exits.

Because it is a one‑shot script, it does not export any functions; it just runs its logic when executed with `node`.

## Libraries used
- **mongoose** – to connect to MongoDB, access the `User` model, and perform the update.
- **node:fs**, **node:path**, **node:url** – may be used for directory path resolution or to load model files (but since no relative imports are detected, they might be present only for ensuring proper file paths when the script is run from the repo root).

## Logic implemented
1. The script obtains the MongoDB connection string from `process.env.MONGODB_URI` (or an equivalent variable).
2. `mongoose.connect(uri)` establishes a connection.
3. It accesses the User model, either by directly requiring it (not shown in imports, but likely via a dynamic path using `node:url` or `node:path`) or by calling `mongoose.model('User')` after ensuring the model is registered.
4. It defines a default language value, e.g., `'en'` (English) or a value read from an environment variable.
5. It runs an update operation:
   ```js
   await UserModel.updateMany(
     { $or: [{ preferredLanguage: { $exists: false } }, { preferredLanguage: null }, { preferredLanguage: '' }] },
     { $set: { preferredLanguage: defaultLanguage } }
   );

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
