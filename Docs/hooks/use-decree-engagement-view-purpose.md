<!-- purpose-doc: normalized -->
# Use Decree Engagement View (`use-decree-engagement-view.ts`)

## Scenario

A signed-in public user opens a decree detail screen and stays on it while reading. The product counts an engagement view only after they have kept the screen focused in the foreground for about thirty seconds, so casual taps do not inflate metrics.

## What it does

Exports `useDecreeEngagementView(decreeId, enabled)`, a hook that runs on each navigation focus session to `decreeId`. While the screen is focused and the React Native app state is `active`, it advances an internal timer each second; after thirty accumulated seconds it performs **one** `POST` to record the view for that visit. Leaving the screen clears the interval and resets progress so a later visit can qualify again.

## Libraries used

- **`useFocusEffect`** (`expo-router`) — Runs the enclosed callback whenever the screen gains or loses focus (tab/stack navigation).
- **`useCallback`** (`react`) — Stabilizes the focus callback across renders when `decreeId` / `enabled` change.
- **`AppState`** (`react-native`) — Read inside the tick function so time only accumulates while the app is foregrounded.
- **`getJwtAccessToken`** (`@/lib/api/jwt-session-storage`) — Retrieves the bearer token when posting; if absent, the hook skips the API call (anonymous readers do not record engagement views server-side).
- **`postPublicDecreeRecordView`** (`@/lib/api/public-user`) — Sends `POST ${API}/api/v1/public/decrees/:id/view` with refresh-on-401 behaviour inherited from that module.

## Logic implemented

1. `useFocusEffect` registers a callback whenever `decreeId` or `enabled` changes.
2. If `decreeId` is falsy or `enabled` is false, the hook returns a no-op cleanup.
3. Otherwise it initializes `accumulatedMs`, `posted`, `cancelled`, and starts a one-second `setInterval` (`tick`).
4. Each tick: abort if `cancelled` or already `posted`; abort if `AppState.currentState !== 'active'` (no time credit in background).
5. Each active tick adds `TICK_MS` (1000 ms) to `accumulatedMs`; before thirty seconds, return.
6. At thirty seconds, set `posted` true, then asynchronously load the JWT; if present, call `postPublicDecreeRecordView(decreeId)` which hits `publicUsersController.recordDecreeView` → `publicUsersService.recordDecreeView` → `decreeViewRepository.recordEngagementView` (inserts into `decree_views`, increments `decree.viewCount`). Source: [`public-users.controller.js`](../../back-end/src/modules/public-users/public-users.controller.js), [`public-users.service.js`](../../back-end/src/modules/public-users/public-users.service.js), [`decree-view.repository.js`](../../back-end/database/repositories/decree-view.repository.js).
7. On blur/unmount, clear the interval and mark `cancelled` so late timers cannot fire.

## Roles

- **public** — Direct: counts views only when a JWT-backed public session exists.
- **inspector** — None by default (hook used from public decree UI).
- **inspector_admin** — None by default.
- **decree_upload_department** — Indirect: aggregated charts may consume resulting `decree_views` rows.
- **system_admin** — Indirect: audits/analytics only.
