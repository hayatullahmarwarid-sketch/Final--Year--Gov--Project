<!-- purpose-doc: normalized -->
# Inspector Tasks Layout (`_layout.tsx`)

## Scenario
The inspector tasks section is nested under the main inspector route (already protected by higher‑level authentication and role guards). This layout provides the navigation container for the task list and the individual task detail/ form screens. It ensures that moving between the task list, task detail tabs, and the inspection form remains within a coherent stack, preserving the inspector’s context.

## What it does
The component creates an Expo Router `<Stack>` navigator with at least two screens:
- **`index`** – the list of all assigned inspection tasks (renders `InspectorTaskListScreen`).
- **`[id]`** – the task detail and form flow (its own nested layout defines sub‑screens like `index` for overview and `form` for the inspection form).

Because no internal imports are detected, this layout does not inject any additional providers, theme overrides, or guards; those are already supplied by the parent `inspector` layout (e.g., `InspectorLayout`). The layout simply configures the stack, possibly setting shared screen options like `headerShown: false` or default animations.

## Libraries used
- **expo-router** – provides the `<Stack>` navigator and screen configuration.

## Logic implemented
1. `InspectorTasksLayout` renders a `<Stack>` element.
2. It defines:
   - `<Stack.Screen name="index" />` → maps to `app/inspector/tasks/index.tsx` (task list).
   - `<Stack.Screen name="[id]" />` → maps to `app/inspector/tasks/[id]/_layout.tsx`, which in turn contains its own sub‑screens.
3. The stack inherits any navigation options (header, gestures) from its parent or defines its own defaults.
4. Because it’s an Expo Router layout, deep‑linking to `/inspector/tasks` or `/inspector/tasks/[id]` activates the correct screen.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Direct: Field inspector workflow.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
