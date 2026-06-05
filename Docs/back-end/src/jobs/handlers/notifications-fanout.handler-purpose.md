<!-- purpose-doc: normalized -->
# Notification Fan‑Out Job Handler (`notifications-fanout.handler.js`)

## Scenario
When the system creates a notification (e.g., a new decree is published), it must deliver push notifications to the registered devices of the targeted users. The fan‑out process involves querying the `device_tokens` collection for the affected users, then sending push messages through Expo Push or Firebase Cloud Messaging. This can be a heavy operation, so it’s performed asynchronously in a background job after the notification record is created.

## What it does
The `notificationsFanoutHandler(job)` function receives a job containing the notification ID or the full notification object. It:

1. Loads the notification details (if only ID is given, it retrieves it; but here it likely receives the full payload, including `recipientId` or `roles`).
2. Uses `DeviceTokenModel` to find all device tokens for the target recipients. If the notification is role‑targeted, it finds all users with that role, then their device tokens.
3. Calls `getPushProvider()` to obtain the push notification service (e.g., Expo, FCM).
4. Sends a push message to each token, possibly in batches.
5. Logs successes and failures using `getLogger`.

## Libraries used
- **../../../database/models/device-token.model.js** – `DeviceTokenModel` to query device tokens by user ID or role.
- **../../config/logger.js** – `getLogger()` for logging.
- **../../services/push/get-push-provider.js** – `getPushProvider` returns an instance of a push notification service.
- **mongoose** – used implicitly via `DeviceTokenModel` for queries.

## Logic implemented
1. The handler extracts `notificationId` (or the full notification) from `job.data`.
2. It determines the target user set:
   - If `recipientId` is present, query device tokens for that user.
   - If `roles` are present, query users with those roles, then get tokens for all those users.
3. It retrieves the message content (title, body, data) from the notification.
4. It calls `getPushProvider().sendMultiple(tokens, message)` (or loops over tokens) to push the notification.
5. It logs the number of successful and failed deliveries.
6. Optionally, failed tokens (e.g., invalidated by the push service) are removed from `DeviceTokenModel` to keep the collection clean.
7. The handler does not modify the original notification; the calling code already created the `NotificationModel` document. It only handles delivery.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
