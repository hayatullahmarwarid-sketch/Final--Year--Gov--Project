<!-- purpose-doc: normalized -->
# Devices Validation Schemas (`devices.validation.js`)

## Scenario
The client sends a device registration request with a push token and platform. The token must be a non‑empty string, platform must be either `'ios'` or `'android'`. When unregistering, the device ID must be a valid ObjectId. These Zod schemas enforce those constraints at the HTTP layer.

## What it does
Exports two schemas:

- **`registerDeviceBodySchema`** – validates the request body for device registration. Likely:
  ```js
  z.object({
    token: z.string().min(1),
    platform: z.enum(['ios', 'android']),
  })

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
