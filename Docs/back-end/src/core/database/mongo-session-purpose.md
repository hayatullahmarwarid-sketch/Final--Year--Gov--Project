<!-- purpose-doc: normalized -->
# MongoDB Transaction Wrapper (`mongo-session.js`)

## Scenario
In a multi‑step operation—such as creating an inspection assignment and deducting a quota, or transferring ownership of a decree while updating multiple related collections—all changes must either complete together or be rolled back entirely to keep the database consistent. Mongoose supports transactions through sessions, but manually starting, committing, and aborting them in every service is repetitive and error‑prone. This utility provides a single, reusable wrapper that handles the lifecycle of a MongoDB transaction using Mongoose sessions, reducing boilerplate and ensuring sessions are always properly cleaned up even when errors occur.

## What it does
Exports an async function `withMongoTransaction(fn)` that:

1. Starts a new Mongoose session using `mongoose.startSession()`.
2. Opens a transaction on that session with appropriate options (e.g., `readPreference: 'primary'`, `readConcern/writeConcern` for replica sets).
3. Executes the provided callback `fn(session)`, passing the session so that all database operations inside the callback use `{ session }` to participate in the transaction.
4. If the callback resolves, commits the transaction with `session.commitTransaction()`.
5. If the callback throws or rejects, aborts the transaction with `session.abortTransaction()`.
6. Always ends the session with `session.endSession()` in a `finally` block, preventing resource leaks.

Because it imports nothing else, it relies solely on Mongoose’s built‑in transaction support. The function expects the database to be a replica set (or sharded cluster) since MongoDB transactions are not available on standalone servers.

## Libraries used
- **mongoose** – provides `startSession()`, session methods `startTransaction()`, `commitTransaction()`, `abortTransaction()`, and lifecycle events.

## Logic implemented
1. The function creates a session:
   ```js
   const session = await mongoose.startSession();

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
