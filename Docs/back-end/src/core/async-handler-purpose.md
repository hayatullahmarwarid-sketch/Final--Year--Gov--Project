<!-- purpose-doc: normalized -->
# Async Handler Wrapper (`async-handler.js`)

## Scenario
Express route handlers often perform asynchronous operations—calling services, querying the database, or making HTTP requests to external APIs. If an error occurs inside a `try/catch` block or a Promise is rejected without being caught, Express does not automatically pass the error to its error‑handling middleware, potentially leaving the request hanging or crashing the process. Manually adding `try/catch` to every route is repetitive and error‑prone. This utility function acts as a lightweight wrapper that automatically catches any rejected Promises and forwards the error to Express’s `next()` function, ensuring it reaches the centralised error handler.

## What it does
Exports a higher‑order function `asyncHandler(fn)`. It takes an async Express route handler (a function that returns a Promise) and returns a new function that:

1. Calls the original handler with the three Express arguments: `req`, `res`, `next`.
2. If the handler’s Promise resolves, nothing special happens (the handler usually calls `res.json()` or `res.send()`).
3. If the handler’s Promise is rejected, the `.catch(next)` arm catches the error and passes it to the `next` function, which triggers Express’s error‑handling middleware.
4. The returned function does not need to be async itself; it simply chains `.catch(next)` onto the Promise returned by the handler.

The wrapper can be used in route definitions like:
```js
router.get('/decrees', asyncHandler(async (req, res) => {
  const decrees = await decreeRepository.findPublished();
  res.json(decrees);
}));

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
