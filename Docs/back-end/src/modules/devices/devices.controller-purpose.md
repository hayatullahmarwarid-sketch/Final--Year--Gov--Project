<!-- purpose-doc: normalized -->
# Devices Controller (`devices.controller.js`)

## Scenario
When a user logs into the mobile app, the app sends the device’s push notification token (along with platform info) to the backend so the server can deliver push notifications. The user may also want to explicitly unregister a device (e.g., on logout). The controller provides endpoints to register and unregister device tokens, delegating the work to the devices service and handling any authorization errors (e.g., if a user tries to manage a token that doesn’t belong to them).

## What it does
Exports a `DevicesController` class and a singleton `devicesController`. Methods:

- **`registerDevice(req, res)`** – extracts the validated body (token, platform) and the authenticated user’s ID from `req.user`. Calls `devicesService.registerDevice(userId, token, platform)`. On success, returns the created (or updated) device record with status `201`.
- **`unregisterDevice(req, res)`** – extracts the device ID from `req.params.deviceId` (validated) and calls `devicesService.unregisterDevice(userId, deviceId)`. The service ensures the device belongs to the user; if not, it may throw an `UnauthorizedError`. Returns a success message with status `200`.

Both methods are wrapped with `asyncHandler`.

## Libraries used
- **../shared/http/index.js** – `asyncHandler`, `HttpStatus`, `sendSuccess`.
- **../../core/errors/app-error.js** – `UnauthorizedError` (though it’s imported, it might be used by the service and re‑thrown; the controller may catch it explicitly, but typically errors are handled by the global error handler).
- **./devices.service.js** – `devicesService`.

## Logic implemented
1. `registerDevice`:
   - Calls `devicesService.registerDevice(req.user._id, req.body.token, req.body.platform)`.
   - Await result.
   - Sends `sendSuccess(res, HttpStatus.CREATED, result)`.
2. `unregisterDevice`:
   - Calls `devicesService.unregisterDevice(req.user._id, req.params.deviceId)`.
   - If the service throws `UnauthorizedError`, the global error handler responds with `401`.
   - Sends `sendSuccess(res, HttpStatus.OK, { message: 'Device unregistered' })`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
