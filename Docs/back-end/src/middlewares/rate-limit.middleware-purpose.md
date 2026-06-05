<!-- purpose-doc: normalized -->

---

### `rate-limit.middleware-purpose.md`
```markdown
# Rate Limiting Middleware (`rate-limit.middleware.js`)

## Scenario
To protect the API from abuse, brute‑force attacks, and accidental overload, rate limiting restricts how many requests a client can make in a window of time. Different endpoints have different limits—global API calls have a generous limit, login has a strict one to prevent credential stuffing, email‑sending endpoints are heavily restricted, and token refresh has its own limit. In production, the limits are tracked in Redis so they work across multiple server instances.

## What it does
Exports five factory functions, each returning an Express middleware configured with `express-rate-limit` and the `rate-limit-redis` store:

- **`globalApiLimiter()`** – general limit (e.g., 1000 requests per 15 minutes per IP).
- **`loginLimiter()`** – strict limit (e.g., 10 requests per 15 minutes per IP).
- **`registerLimiter()`** – strict limit (e.g., 5 registrations per hour per IP).
- **`emailSendLimiter()`** – very strict (e.g., 3 emails per hour per IP).
- **`refreshLimiter()`** – moderate limit (e.g., 30 refreshes per 15 minutes per IP).

Each middleware, when a client exceeds the limit, responds with a `429 Too Many Requests` status and a standardised error body using `sendError`. The middleware uses `getRedis()` to share rate‑limit state across processes.

## Libraries used
- **express-rate-limit** – rate limiting middleware for Express.
- **rate-limit-redis** – Redis store adapter for `express-rate-limit`.
- **../config/env.js** – `getEnv()` for rate limit settings (window, max).
- **../config/redis.js** – `getRedis()` for the shared store.
- **../config/logger.js** – `getLogger()` for logging rate‑limit violations.
- **../core/errors/http-status.js** – `HttpStatus` for status codes.
- **../utils/api-response.js** – `sendError()` for standardised error responses.

## Logic implemented
1. Each factory function creates an `express-rate-limit` middleware instance with:
   - `windowMs` from environment or defaults (e.g., 15 minutes).
   - `max` (request count) from environment or defaults.
   - `standardHeaders: true` (RateLimit headers).
   - `store: new RedisStore({ sendCommand: (...args) => getRedis().call(...args) })`.
   - `handler: (req, res) => sendError(res, HttpStatus.TOO_MANY_REQUESTS, 'Too many requests')`.
2. The returned middleware is applied to specific routes (e.g., `app.use('/api/v1/auth/login', loginLimiter())`).
3. Each request from the same IP consumes a token in the current window; when exhausted, the handler responds with 429.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
