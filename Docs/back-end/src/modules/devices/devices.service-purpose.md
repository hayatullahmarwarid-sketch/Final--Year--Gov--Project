<!-- purpose-doc: normalized -->
# Devices Service (`devices.service.js`)

## Scenario
The server needs to manage a collection of device tokens for each user—register new tokens (or update existing ones for the same device), delete tokens when they become invalid or the user logs out, and retrieve tokens for notification fan‑out. The service encapsulates the logic for interacting with the `DeviceTokenModel` and enforcing ownership rules.

## What it does
Exports a `DevicesService` class with methods like:

- **`registerDevice(userId, token, platform)`** – checks if the token already exists for this user/device combination; if so, it updates the `createdAt` or other fields. Otherwise, inserts a new `DeviceTokenModel` document. Returns the saved token record.
- **`unregisterDevice(userId, deviceId)`** – finds the device token document by `_id` and `userId`. If not found, throws `NotFoundError`. If found but the `userId` doesn’t match, throws a generic error (could be `UnauthorizedError`). Deletes the document (or soft‑deletes).
- **`findTokensByUser(userId)`** – returns all active device tokens for a user (used by notification fan‑out).

## Libraries used
- **mongoose** – via `DeviceTokenModel`.
- **../../../database/models/device-token.model.js** – `DeviceTokenModel`.
- **../../core/errors/app-error.js** – `NotFoundError`.

## Logic implemented
1. `registerDevice(userId, token, platform)`:
   - Use `DeviceTokenModel.findOneAndUpdate({ userId, token }, { $set: { platform, lastUsedAt: new Date() } }, { upsert: true, new: true })` to avoid duplicates.
   - Return the document.
2. `unregisterDevice(userId, deviceId)`:
   - `const doc = await DeviceTokenModel.findById(deviceId);`
   - If `!doc`, throw `new NotFoundError('Device token not found')`.
   - If `doc.userId.toString() !== userId`, throw a permission error (perhaps `new UnauthorizedError('Not your device')` — note: that error is not imported here but could be handled elsewhere; the service might throw a generic `NotFoundError` instead).
   - `await doc.deleteOne();` (or soft‑delete if preferred).
3. `findTokensByUser(userId)`:
   - `await DeviceTokenModel.find({ userId, deletedAt: null });` returns tokens.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
