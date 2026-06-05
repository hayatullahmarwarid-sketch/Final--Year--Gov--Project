<!-- purpose-doc: normalized -->
# System Admin Settings Screen (`settings.tsx`)

## Scenario
The system admin needs to configure global platform settings—such as system‑wide notification preferences, login policies, maintenance mode, and integration keys. This screen presents a native settings form pre‑built in the `AdminSettingsNative` component. The admin can toggle switches, enter text values, and save changes. The settings are persisted to the backend and take effect immediately across the platform.

## What it does
This screen is a thin wrapper that directly renders the `AdminSettingsNative` component. The component encapsulates all settings fields, validation, and API communication. It likely consumes the `SystemAdminRemoteContext` or its own internal state to load current settings, and provides save functionality. The screen file itself does not import additional hooks or APIs; it exists solely to register the route at `/system-admin/settings` so that the settings form appears in the correct place within the navigation hierarchy and can be deep‑linked.

## Libraries used
- **react** / **react-native** – core rendering.
- **@/components/system-admin/AdminSettingsNative** – the fully implemented settings form component.

## Logic implemented
1. The file default‑exports the `SystemAdminSettingsScreen` component.
2. That component renders `<AdminSettingsNative />`, which internally handles:
   - Fetching current global settings from the backend.
   - Displaying a scrollable form with sections (e.g., “Security”, “Notifications”, “Integrations”).
   - Each setting uses appropriate input controls (`Switch`, `TextInput`, `Picker`).
   - Validating inputs before saving.
   - Calling the appropriate API endpoints to persist changes.
   - Showing success or error toasts.
3. The screen participates in deep linking: navigating to `/system-admin/settings` opens this form directly.

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Primary UI for system administration features.
