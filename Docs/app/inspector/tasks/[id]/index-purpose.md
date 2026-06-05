<!-- purpose-doc: normalized -->
# Inspector Task Detail Screen (`index.tsx`)

## Scenario
An inspector opens the app and sees a list of inspection tasks assigned to them. Tapping a task card navigates to this screen. Here, the inspector can review the task’s full details before starting work. The screen is organised into tabs: **Overview**, **Guidelines**, and **History**.  
- **Overview** shows the inspection title, associated decree/category, the inspection location (as defined in the template), deadline, and other metadata.  
- **Guidelines** contains official instructions, including the template’s location and category.  
- **History** shows a timeline of previous actions taken on this task (e.g., status changes, comments).  

From this screen the inspector may also navigate to a form to begin or continue the inspection.

## What it does
This screen is a simple Expo Router route that renders the `InspectorTaskDetailScreen` component. The component receives the task `id` from the route parameter (via `useLocalSearchParams` inside the component) to load the appropriate task data. The screen itself does not contain any additional logic—it merely re‑exports the component so that Expo Router’s file‑based system can map the path `inspector/tasks/[id]` to this detail view. All fetching, state management, and UI are delegated to the imported component.

## Libraries used
- **expo-router** – the route is defined by the file’s location; the component likely uses navigation for tabs and internal routing.  
- **react** / **react-native** – the underlying component renders UI elements (ScrollView, Text, tabs, etc.).  
- **@/components/inspector/InspectorTaskDetailScreen** – the actual full‑featured screen that handles data loading, display, and interaction.

## Logic implemented
1. The Expo Router matches the path `/inspector/tasks/[id]` to this file.  
2. The file default‑exports the `InspectorTaskDetailScreen` component, which was imported from `@/components/inspector/InspectorTaskDetailScreen`.  
3. When the screen renders, the `InspectorTaskDetailScreen` component internally:
   - Extracts the task ID from the route parameters.  
   - Fetches the task details (probably via an API call to a backend).  
   - Renders the tabbed interface (Overview, Guidelines, History).  
   - Handles user interactions such as tapping a tab or starting the inspection.  
4. The screen participates in deep linking: any link to `/inspector/tasks/[id]` will open this view directly.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Direct: Field inspector workflow.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
