<!-- purpose-doc: normalized -->
# Splash / Root Index Screen (`index.tsx`)

## Scenario
The very first screen the user sees when the app is launched. It displays the app’s emblem while performing a quick health check and determining where to route the user. If they are already logged in, they are sent to their appropriate home screen (based on role). If not, they are sent to the language selection screen or the login screen.

## What it does
The component is a lightweight route that renders the `EmblemMark` and uses several hooks to decide the next step. On mount, it calls `getHealth` to verify the backend is reachable. It then reads `useAuthSession` to see if a valid session exists. If yes, it calls `homeHrefForRole(session.role)` to get the home path (e.g., `/inspector` for inspectors, `/dept-upload` for department officers, `/` for public users) and redirects there with `router.replace`. If no session, it may check the language context; if no language is set, it could redirect to `/language`, otherwise to `/login`. The screen uses `useAppLanguage` and `useAppTranslation` for any static text (maybe a loading message). The status bar is configured appropriately.

## Libraries used
- **expo-router** – navigation.
- **expo-status-bar** – status bar.
- **react** / **react-native** / **react-native-safe-area-context** – core.
- **@/components/brand/EmblemMark** – brand emblem.
- **@/constants/brand** – colour token.
- **@/contexts/app-language-context** – language context.
- **@/contexts/auth-session-context** – session.
- **@/hooks/use-app-translation** – translations.
- **@/lib/api/health** (`getHealth`) – health check.
- **@/lib/auth-routing** (`homeHrefForRole`) – maps role to home path.

## Logic implemented
1. On mount, `getHealth()` is called to ensure backend is available (maybe a timeout). If fails, a “service unavailable” message may be shown (not imported, but basic).
2. The session is read. If session is authentic and role exists:
   - `homeHrefForRole(role)` returns the home route.
   - `router.replace(home)` navigates away.
3. If no session:
   - Check language: if no language selected, `router.replace('/language')`.
   - Else `router.replace('/login')`.
4. While the decision is being made, the `EmblemMark` is displayed centered with the brand colour.
5. The status bar is set to match the brand background.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
