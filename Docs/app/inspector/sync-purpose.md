<!-- purpose-doc: normalized -->
# Inspector Sync Screen (`sync.tsx`)

## Scenario
Inspectors often work in remote locations with limited or no internet connectivity. They can complete inspection forms offline, and those submissions are stored in a local queue. When they are back online, they open this Sync screen. It shows how many inspections are pending upload, allows them to manually trigger a sync, and displays a detailed list of queued items with their status (e.g., “Pending”, “Uploading”, “Completed”, “Failed”). The inspector can also retry failed syncs or remove items if needed.

## What it does
The file is a route that renders `InspectorSyncScreen`. This component is tightly coupled with the `InspectorSyncQueueContext` (provided by the parent layout). It reads the sync queue state—list of queued inspection submissions, their progress, and any errors—and displays them in a structured list. A “Sync Now” button triggers the context’s `syncAll()` method, which processes the queue sequentially, uploading each inspection to the backend. The screen shows real‑time progress as items are uploaded. The component may also observe network status to automatically start syncing when connectivity is restored.

## Libraries used
- **expo-router** – defines the route; the component may navigate back after sync completes.
- **react** / **react-native** – renders the sync status UI.
- **@/components/inspector/InspectorSyncScreen** – the full component that encapsulates the sync UI and logic.

## Logic implemented
1. The file re‑exports `InspectorSyncScreen`.
2. Inside the component:
   - It consumes `InspectorSyncQueueContext` to get the queue array, sync status, and the `syncAll` function.
   - It displays a header with a “Last synced: [timestamp]” and a “Sync Now” button.
   - If the queue is empty, it shows a “All inspections are synced” message.
   - Otherwise, it renders a `FlatList` of queued items, each showing:
     - The inspection title or template name.
     - The form data summary (e.g., “Location: Paktika-Zerghoun Shar”).
     - A status icon (⏳ pending, ↑ uploading, ✔ uploaded, ❌ failed).
   - Pressing “Sync Now” calls `syncAll()`. The context updates each item’s status in real time.
   - For failed items, a “Retry” button may be available per item.
   - When all items are processed, a success toast is shown.
   - The screen uses the inspector theme colours.
3. It also may have a background auto‑sync listener (using `NetInfo`) that automatically triggers sync when the device regains connectivity, even if the screen is open.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Direct: Field inspector workflow.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
