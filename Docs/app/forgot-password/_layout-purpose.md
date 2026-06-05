<!-- purpose-doc: normalized -->
# Forgot Password Flow Layout (`_layout.tsx`)

## Scenario
A user who cannot remember their password opens the forgot‑password flow from the login screen. This flow consists of three steps: entering their email, verifying a one‑time code, and setting a new password. Throughout this process, the user’s recovery state (email, received token, step progression) must be preserved so that they can move back and forth between the steps without losing data.

## What it does
The layout wraps all screens under `app/forgot-password` with the `ForgotPasswordRecoveryProvider` context. This provider manages the entire recovery workflow state in memory, including:
- The email address entered in step 1.
- The verification token submitted in step 2.
- UI status flags (e.g., loading, error messages).

By placing the provider at the layout level, all child screens (`index`, `verify`, `reset`) can read and update the recovery state through the `useForgotPasswordRecovery` hook. The layout itself does not add any UI chrome or navigation bar; it simply renders the active child screen via `<Slot />`.

## Libraries used
- **expo-router** – provides the `<Stack>` or `<Slot>` and the file‑based routing container.
- **@/contexts/forgot-password-recovery-context** (`ForgotPasswordRecoveryProvider`) – supplies the shared recovery state to the entire flow.

## Logic implemented
1. `ForgotPasswordLayout` renders the `ForgotPasswordRecoveryProvider`.
2. Inside the provider, it renders `<Slot />`, which loads whichever child route is active (`index`, `verify`, or `reset`).
3. Any child screen can consume the recovery context to read the email/token or to advance to the next step.
4. Because the provider persists across screen changes (as long as the layout stays mounted), the state survives navigation pushes and pops within the flow.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
