<!-- purpose-doc: normalized -->
# Inspector Task Form Screen (`form.tsx`)

## Scenario
After reviewing a task, the inspector taps a “Start Inspection“ or ”Fill Form“ button from the task detail screen. They are brought to this form screen, where they can complete the inspection by filling out the required fields—observations, checklists, location confirmation, photo attachments, etc.—as defined by the inspection template. Once the form is submitted, the task status updates (e.g., to “Completed” or “Pending Review”) and the inspector is returned to the task detail or the task list.

## What it does
This file exists to register a route for the inspection form at `inspector/tasks/[id]/form`. It default‑exports the `InspectorFormScreen` component, which encapsulates the entire form logic. The form knows which inspection template to render because the component reads the task ID from the route, fetches the corresponding template, and dynamically generates the input fields. The screen itself is only a thin wrapper; all functionality—data fetching, form validation, submission, and user feedback—resides in the imported component.

## Libraries used
- **expo-router** – provides the route and access to the `[id]` parameter; navigation back on submission.  
- **react** / **react-native** – the form is composed of React Native components (TextInput, Picker, Button, etc.).  
- **@/components/inspector/InspectorFormScreen** – the fully implemented form screen that handles all business logic.

## Logic implemented
1. The Expo Router matches the path `/inspector/tasks/[id]/form`.  
2. The `InspectorFormScreen` component is rendered as the screen’s content.  
3. Internally, the component:
   - Extracts the task ID from the route’s dynamic parameter.  
   - Fetches the inspection template and any pre‑existing draft answers.  
   - Renders the form fields (text inputs, dropdowns, photo uploads, etc.) according to the template structure.  
   - Validates user inputs and enables submission only when required fields are complete.  
   - On submission, sends the inspection data to the backend and updates the task status.  
   - Navigates back to the task detail or shows a success confirmation.  
4. Deep links to `/inspector/tasks/[id]/form` will open the form directly, provided the inspector is authenticated and authorised.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Direct: Field inspector workflow.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
