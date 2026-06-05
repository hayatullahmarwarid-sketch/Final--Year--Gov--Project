<!-- purpose-doc: normalized -->
# Exam Section Layout (`_layout.tsx`)

## Scenario
When a user taps an exam from the Exams tab, they enter the exam section, which can contain multiple screens like instructions, the exam-taking view, and results. Before any of these screens load, the layout must ensure the user is authenticated and has a valid public‑user identity. If the user is not authorised (e.g., not logged in or missing public‑user data), they are immediately redirected to a safe route such as the login screen or the home tab, preventing unauthorised access to exam content via deep links or stale sessions.

## What it does
This layout wraps all screens inside the `app/exam` folder with a redirection guard. It imports `useRedirectNonPublicFromPublicRoutes`, a custom hook that checks the authentication session and public‑user context, then performs an automatic redirect if the user is not permitted to view public‑facing routes. The layout itself renders nothing else—it simply returns the `<Slot />` component to display the active child screen after the guard passes. By placing this logic in the layout, any deep link to `/exam/some-id` or its sub‑routes will first trigger the authorisation check before showing any exam content.

## Libraries used
- **expo-router** – provides the `<Stack>` or `<Slot>` component and the file‑based routing context.
- **react** – renders the layout component.
- **@/hooks/use-redirect-non-public-from-public-routes** – evaluates the user’s authorisation for public routes and redirects when necessary.

## Logic implemented
1. `ExamStackLayout` is called by Expo Router whenever any screen under `app/exam` is about to appear.
2. The hook `useRedirectNonPublicFromPublicRoutes()` is invoked. Its internal logic typically:
   - Reads the authentication session from `useAuthSession`.
   - Reads the public‑user data from `usePublicUserData`.
   - If either is missing or invalid, it uses `router.replace` to navigate to a safe route (e.g., `/login` or `/`) and optionally displays a toast.
3. If the user is authorised, the hook returns `null` and the layout renders `<Slot />`, which displays the active child screen (e.g., `[id]/instructions`, `[id]/take`, `[id]/results`).
4. The guard re‑runs on every navigation event, so even if the session expires while the user is on an exam screen, they will be redirected on the next interaction.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
