<!-- purpose-doc: normalized -->
# Canonical Queue Names (`queue-names.js`)

## Scenario
The system uses several background job queues—email sending, push notification fan‑out, certificate generation, dashboard snapshots—and both the API server (which enqueues jobs) and the worker process (which consumes and processes them) need to reference those queues by name. Hard‑coding queue name strings in multiple places risks mismatches and makes it hard to see all queues at a glance. This module defines a single source of truth: a frozen object mapping semantic keys to queue names, and an array of all queue names for easy iteration.

## What it does
Exports two constants:

- **`QUEUE`** – a frozen object with properties like `EMAIL`, `NOTIFICATIONS_FANOUT`, `CERTIFICATE_ISSUE`, `DASHBOARDS_SNAPSHOT`, etc., each mapped to its actual queue name string (e.g., `'email-queue'`).
- **`QUEUE_NAMES`** – a frozen array containing all the values from `QUEUE` (e.g., `['email-queue', 'notifications-fanout-queue', …]`). This array can be used to start workers for all queues without manually listing them.

Both are frozen with `Object.freeze` to prevent accidental modifications.

## Libraries used
- None.

## Logic implemented
1. Define a plain object mapping descriptive keys to the exact queue name strings.
2. Freeze the object.
3. Create an array by extracting `Object.values(QUEUE)` and freeze it.
4. Any module that enqueues a job uses `QUEUE.EMAIL`, and the worker registration uses `QUEUE_NAMES` to iterate.
5. This ensures consistency and provides a single place to rename a queue if needed.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
