<!-- purpose-doc: normalized -->
# Devices Routes (`devices.routes.js`)

## Scenario
The API needs a protected endpoint for users to register and unregister their device tokens. This file sets up the routes, ensuring that only authenticated requests can manage devices, and that the request bodies and parameters are validated.

## What it does
Creates an Express `Router` with the following routes:

- **`POST /`** – registers a new device token. Applies `authenticate` middleware, then `validateRequest(registerDeviceBodySchema)`, and finally `devicesController.registerDevice`.
- **`DELETE /:deviceId`** – unregisters a specific device token. Applies `authenticate`, `validateRequest(deviceIdParamSchema)` for the `deviceId` parameter, and `devicesController.unregisterDevice`.

The router is exported as `devicesRouter` and mounted (e.g., at `/api/v1/devices`) in the main app.

## Libraries used
- **express** – Router.
- **../shared/http/index.js** – `validateRequest`.
- **../../middlewares/auth.middleware.js** – `authenticate`.
- **./devices.controller.js** – `devicesController`.
- **./devices.validation.js** – `registerDeviceBodySchema`, `deviceIdParamSchema`.

## Logic implemented
1. `devicesRouter.post('/', authenticate, validateRequest(registerDeviceBodySchema), devicesController.registerDevice);`
2. `devicesRouter.delete('/:deviceId', authenticate, validateRequest(deviceIdParamSchema), devicesController.unregisterDevice);`
3. No other middleware needed; the user must be logged in, and the token must be valid.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
