# Views counting (decree engagement)

## What counts as a “view”

A view is **not** a raw page load. It is recorded only after:

1. **Client:** The decree reader screen is focused, the app is in the **active** foreground state, and **30 seconds** of dwell time have accumulated (1s ticks). Time pauses when the app is backgrounded.
2. **Client:** After that threshold, the app sends **one** `POST` per focus session (see `hooks/use-decree-engagement-view.ts`).
3. **Server:** The handler records an engagement **only if** the caller is a **signed-in public user** (`ownerUserId` present). Anonymous users get a response explaining that sign-in is required.

Sources:

- `hooks/use-decree-engagement-view.ts` — `DWELL_MS = 30_000`, `TICK_MS = 1000`, uses `useFocusEffect`; leaving the screen clears the interval (timer resets on next visit).
- `lib/api/public-user.ts` — `postPublicDecreeRecordView` → `POST .../public/decrees/:id/view`.
- `back-end/src/modules/public-users/public-users.service.js` — `recordDecreeView`: validates catalog decree; if no `ownerUserId`, returns `{ recorded: false, note: 'Sign in...' }`.
- `back-end/database/repositories/decree-view.repository.js` — `recordEngagementView`.

## When the count increases

- **Per qualifying session:** Each successful POST creates **one** new row in collection `decree_views` and increments `decree.viewCount` by 1.
- **Repeat visits:** The code and schema explicitly allow **multiple rows per (decreeId, viewerUserId)** over time (“Repeat visits each add another row”). There is **no** deduplication by IP or cooldown window at the repository layer.

Migration note: `0005_decree_views_engagement_many_per_user.mjs` exists to align indexes with “many rows per user per decree.”

## Where data is stored

| Storage | Role |
| --- | --- |
| MongoDB `decree_views` | One document per recorded engagement: `decreeId`, `viewerUserId`, `viewedAt`, soft-delete via domain plugin. |
| MongoDB `decrees.viewCount` | Denormalized counter incremented with each recorded view (`$inc: { viewCount: 1 }`). |

No in-memory or Redis layer appears in this path.

## Deduplication

- **Not IP-based:** Identity is **user id** only (`viewerUserId`).
- **Not unique per user per decree:** Index `{ decreeId, viewerUserId, viewedAt }` is **not unique**; duplicates across days/sessions are intended.
- **Session boundary:** Client posts **once per focus session** after 30s; revisiting the decree after blur resets accumulation so another 30s can yield another server-side row.

## Uploader analytics

`decreeViewRepository` aggregates views **by UTC day/month** for decrees whose **`createdByUserId`** matches the uploader, and can split by **primary category** (`categoryIds[0]`). Charts use `viewedAt`, not `createdAt` on the decree.

## Needs verification

- Whether any **CDN/proxy** logs hits separately from this application metric (not visible in this repo’s mobile + API path).
