<!-- purpose-doc: normalized -->
# Exam Detail Tab Layout (`_layout.tsx`)

## Scenario
Once a user selects an exam from the Exams tab, they are taken to a dedicated exam section that contains three sub‑screens: **Instructions**, **Take Exam**, and **Results**. This layout manages the stack navigation between these screens, allowing the user to switch between instructions, the active exam session, and their final score without losing context or leaving the exam ID scope.

## What it does
The component sets up an Expo Router `<Stack>` navigator with three screens:
- `instructions`
- `take`
- `results`

It does not import any custom providers, hooks, or theming—the screens under this layout inherit the authentication and public‑user contexts already established by higher layouts. The layout’s sole purpose is to provide a navigation container so that moving between the exam’s sub‑screens behaves like a coherent flow (e.g., pushing `take` from `instructions`, then navigating to `results` after submission). Because no internal imports are detected, the screen options (header, animation) are likely defined inline or rely on Expo Router defaults.

## Libraries used
- **expo-router** – provides `<Stack>` and screen configuration for file‑based navigation.

## Logic implemented
1. `ExamIdLayout` renders a `<Stack>` element.
2. It defines three `<Stack.Screen>` entries:
   - `name="instructions"` (maps to `app/exam/[id]/instructions.tsx`)
   - `name="take"` (maps to `app/exam/[id]/take.tsx`)
   - `name="results"` (maps to `app/exam/[id]/results.tsx`)
3. Expo Router automatically uses the `[id]` param from the parent segment for all child routes.
4. Navigation between these screens is handled by the child components via `router.push` or `router.replace` within the same stack, so the back button and gestures work as expected.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
