<!-- purpose-doc: normalized -->
# Queue Registry (`queue-registry.js`)

## Scenario
The back‑end needs a unified way to enqueue background jobs and start workers that process them. In production, this is backed by Redis via BullMQ for reliable, persistent queues. However, in development or when Redis is unavailable, a lightweight in‑process fallback (`InProcessQueue`) can be used instead. The rest of the application should not need to know whether the queue implementation is Redis‑backed or in‑process. The queue registry abstracts this by providing a single set of functions: `getQueue`, `enqueue`, and `startWorker`, and handles graceful shutdown of all queues.

## What it does
Exports four functions:

- **`getQueue(name)`** – returns a BullMQ `Queue` instance for the given name. The instance is either newly created (connecting to Redis via `getRedis()`) or retrieved from a cache.
- **`enqueue(queueName, jobName, data, options)`** – adds a job to a queue. If the queue system is in fallback mode (no Redis), it uses the `InProcessQueue` class instead. Provides a unified interface: callers simply `await enqueue(QUEUE.EMAIL, 'send-verification', { to })`.
- **`startWorker(name, handler, options)`** – starts a BullMQ `Worker` that processes jobs from the named queue using the given handler. If in fallback mode, it registers the handler with the `InProcessQueue`. Returns the worker instance.
- **`shutdownQueues()`** – gracefully closes all Redis connections and outstanding jobs, typically called during server shutdown. It iterates over known queues, calls `close()` on each, and also disconnects the underlying Redis client.

The module uses `QUEUE_NAMES` from `queue-names.js` to know the list of queues, `getRedis` for the Redis client, and `getLogger` for logging.

## Libraries used
- **bullmq** – durable job queues backed by Redis (provides `Queue`, `Worker`).
- **../config/redis.js** – `getRedis()` to obtain the Redis connection for BullMQ.
- **../config/logger.js** – `getLogger()` for logging queue events.
- **./queue-names.js** – `QUEUE_NAMES` array for managing all queues.
- **./fallback/in-process-queue.js** – `InProcessQueue` class as a fallback when Redis is not available.

## Logic implemented
1. Internally, the module maintains a map `queues` (name → BullMQ Queue instance).
2. `getQueue(name)`:
   - Checks if in fallback mode (e.g., environment variable `QUEUE_FALLBACK` or no Redis URL). If fallback, returns the `InProcessQueue` singleton.
   - Otherwise, if a Queue for that name isn’t already in the map, creates one with `new Queue(name, { connection: getRedis() })` and stores it.
   - Returns the existing/created Queue.
3. `enqueue(queueName, jobName, data, options)`:
   - Gets the queue via `getQueue(queueName)`.
   - If it’s a BullMQ Queue, calls `queue.add(jobName, data, options)`.
   - If it’s the `InProcessQueue`, calls `queue.addJob(jobName, data)`.
   - Returns the job (or promise of job result for in‑process).
4. `startWorker(name, handler, options)`:
   - If not fallback, creates a new `Worker(name, handler, { connection: getRedis(), ...options })`.
   - If fallback, calls `inProcessQueue.process(handler)` (or a similar method) and stores the handler.
   - Attaches event listeners (completed, failed) for logging.
   - Returns the worker (or a stub for in‑process).
5. `shutdownQueues()`:
   - Iterates over all BullMQ Queue instances and calls `queue.close()`.
   - If using fallback, drains the `InProcessQueue`.
   - Disconnects Redis via `getRedis().quit()` or similar.
   - This function is attached to `process.on('SIGTERM', ...)` in the main entry point.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
