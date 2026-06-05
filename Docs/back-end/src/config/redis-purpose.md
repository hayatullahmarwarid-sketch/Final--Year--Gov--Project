<!-- purpose-doc: normalized -->

---

### `redis-purpose.md`
```markdown
# Redis Connection Manager (`redis.js`)

## Scenario
The application uses Redis for caching, session storage, rate limiting, and possibly as a message queue. A reliable Redis connection must be established at startup and gracefully closed on shutdown. This module provides a singleton Redis client that any service can import, along with lifecycle functions to connect and disconnect.

## What it does
Exports three items:
- `getRedis()` – returns the active `ioredis` client instance. If no connection exists, it lazily creates one (or requires an explicit `connectRedis` call).
- `disconnectRedis()` – gracefully closes the Redis connection, waiting for pending commands to complete.

It uses `getEnv` to obtain the Redis connection string (`REDIS_URL`) and optionally `REDIS_PASSWORD`, `REDIS_TLS`. It also uses `getLogger` to log connection events (connected, error, reconnecting, closed). The underlying `ioredis` client automatically handles reconnection with backoff, so the application remains resilient to temporary Redis outages.

## Libraries used
- **ioredis** – robust Redis client with Promises and built‑in reconnection.
- **./env.js** – `getEnv()` for `REDIS_URL` and other Redis settings.
- **./logger.js** – `getLogger()` for logging Redis events.

## Logic implemented
1. The module stores a module‑level `redisClient` variable.
2. When `getRedis()` is called:
   - If `redisClient` already exists and is connected, return it.
   - Otherwise, create a new `ioredis` instance:
     ```js
     const redisUrl = getEnv().REDIS_URL;
     redisClient = new Redis(redisUrl, {
       maxRetriesPerRequest: 3,
       retryStrategy: (times) => Math.min(times * 50, 2000),
       lazyConnect: true, // or connect immediately
     });
     redisClient.on('connect', () => logger.info('Redis connected'));
     redisClient.on('error', (err) => logger.error(err, 'Redis error'));

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
