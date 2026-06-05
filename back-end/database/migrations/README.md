# Database migrations

Numbered forward-only migrations (Phase 3). Replaces the boot-time `syncIndexes()` call for
production: the API no longer mutates schema on boot.

## File format

Each migration is a JS module exporting `up(ctx)` and optional `down(ctx)`:

```js
// 0001_example.mjs
export const name = '0001_example';

export async function up({ mongoose, logger }) {
  await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
}

export async function down({ mongoose }) {
  await mongoose.connection.db.collection('users').dropIndex({ email: 1 });
}
```

Files MUST be named `<4-digit-order>_<slug>.mjs` so the runner applies them in lexical order.

## Commands

```bash
npm run db:migrate           # apply all pending
npm run db:migrate:status    # list pending + applied
npm run db:migrate:down      # revert last applied (manual recovery)
```

## Why not `umzug`?

We only need lexicographic ordering + a `schema_migrations` collection. Keeping it tiny and
dependency-free means CI boot is faster and less brittle.
