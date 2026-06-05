# Sharia Decrees — FinalProject

Production-style monorepo for **Sharia Decrees**:

- **Expo (React Native)** at the repository root — primary client for public users, inspectors, decree-upload staff, system admin, and inspector admin flows (Expo Router under [`app/`](app/)). The app talks to the API with **JWT access and refresh tokens** (see [`lib/api/auth-jwt.ts`](lib/api/auth-jwt.ts), [`lib/api/jwt-session-storage.ts`](lib/api/jwt-session-storage.ts)) and `EXPO_PUBLIC_API_BASE_URL` (see [`constants/api.ts`](constants/api.ts)).
- **Node API** in [`back-end/`](back-end/) — Express + MongoDB (`/api/v1/...`); JWT auth, RBAC, and domain modules are implemented for the routes the mobile app uses.

## Configuration quick reference

| Concern | Where |
|--------|--------|
| Mobile API base URL (dev / CI / EAS) | Root `.env` → `EXPO_PUBLIC_API_BASE_URL` ([`.env.example`](.env.example)); staging/prod via [EAS Build env](https://docs.expo.dev/build-reference/variables/) or profile env in `eas.json` ([`eas.json.example`](eas.json.example)) |
| Expo URL scheme (deep links) | [`app.json`](app.json) → `expo.scheme` is `finalproject`. Any email or web callback that should open the app must use the same scheme (or universal links / app links you configure for that scheme). |
| API secrets, MongoDB, CORS, SMTP | [`back-end/.env.example`](back-end/.env.example) |

## Documentation

Product and front-end engineering docs: **[`docs/`](docs/README.md)**. API layout, scripts, and contracts: **[`back-end/README.md`](back-end/README.md)** and **[`back-end/api/docs/README.md`](back-end/api/docs/README.md)**. **Release, EAS, API hosting, TLS, CORS:** **[`docs/ci-and-release-frontend.md`](docs/ci-and-release-frontend.md)**.

## Common commands

Run installs once per package (`npm install` in each directory you use).

| Goal | Command |
|------|---------|
| Mobile / Expo (repo root) | `npm run start` or `npx expo start` |
| Lint Expo (repo root) | `npm run lint` |
| API dev | `cd back-end`, copy `.env.example` → `.env`, then `npm run dev` |
| API tests | `cd back-end` then `npm test` |

Health check (API): `GET http://localhost:4000/health` (default port from `back-end/.env.example`).

## Expo template notes

Default **create-expo-app** onboarding text is preserved in [`docs/expo-getting-started.md`](docs/expo-getting-started.md).
