<!-- purpose-doc: normalized -->
# MongoDB Connection Manager (`mongoose.js`)

## Scenario
When the back‑end server starts, it must establish a reliable connection to the MongoDB database before accepting any requests. Similarly, when the server gracefully shuts down (e.g., on `SIGTERM` or `SIGINT`), it must close the connection cleanly to avoid leaving open sockets and to ensure any pending writes are completed. This module centralises that lifecycle management and provides a simple readiness check that other parts of the application can call to guarantee the database is available.

## What it does
The module exports three functions:

- **`connectMongo()`** – Initialises the Mongoose connection using environment variables (database URI, credentials, options) and attaches event listeners.
- **`disconnectMongo()`** – Gracefully closes the active Mongoose connection.
- **`mongoReady()`** – Returns a boolean indicating whether Mongoose is currently connected to the MongoDB server.

It relies on `getEnv` to retrieve the connection string (`MONGO_URI` or similar) and any required options, and on `getLogger` to output connection status messages and errors.

## Libraries used
- **mongoose** – ODM for MongoDB, manages connection, schemas, and query execution.
- **../../src/config/env.js** (`getEnv`) – provides the Mongo URI and optional connection settings (e.g., `dbName`, `user`, `pass`).
- **../../src/config/logger.js** (`getLogger`) – logging for connection events, errors, and shutdown.

## Logic implemented
1. **connectMongo**:
   - Reads the MongoDB connection string and options from `getEnv()`.
   - Calls `mongoose.connect(uri, options)`.
   - Registers Mongoose connection event listeners:
     - `'connected'` – logs “MongoDB connected”.
     - `'error'` – logs the error and may set a flag to indicate connection failure.
     - `'disconnected'` – logs the event.
   - Stores a reference (or relies on `mongoose.connection.readyState`) for later readiness checks.
   - If the connection fails, the error is logged and the process may continue (the readiness check will return false).

2. **mongoReady**:
   - Checks `mongoose.connection.readyState === 1` (connected).
   - Returns `true` if connected, `false` otherwise.
   - Used by health‑check endpoints or middleware to verify database availability before processing requests.

3. **disconnectMongo**:
   - Calls `mongoose.disconnect()` or `mongoose.connection.close()`.
   - Logs “MongoDB disconnected”.
   - Typically invoked in a graceful shutdown handler (e.g., `process.on('SIGINT', ...)` in the main server file).

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
