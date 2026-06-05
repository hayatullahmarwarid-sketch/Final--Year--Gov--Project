# Purpose-doc authoring guide

Purpose documentation lives beside the codebase as `Docs/**/*-purpose.md`, paired with a source file (`*.tsx`, `*.ts`, `*.js`, …) when possible. See [`scripts/normalize-purpose-docs.mjs`](../scripts/normalize-purpose-docs.mjs) for mechanical normalization.

As of the last inventory run (`node scripts/inventory-purpose-docs.mjs`), template-style skeletons should be rare; depth comes from **manual narrative**.

## Required sections

Every `*-purpose.md` should contain:

1. **Title** — `# Title (`relative/path/to/source.tsx`)`

2. **Scenario** — Who triggers this code and under what circumstances (user gesture, navigation, cron, import side-effect).

3. **What it does** — One paragraph on exported surface and responsibilities (no vague filler).

4. **Libraries used** — **Account for every `import`** in the source file:
   - External packages: name + role (e.g. “Express — HTTP router factory”).
   - Internal `@/` imports: path + symbols used + why this module is needed.
   - Side-effect imports (e.g. `import './polyfill'`) — explain the side effect.
   - Grouping rule: you may group only when several imports share one obvious purpose (“React — hooks API for component lifecycle”).

5. **Logic implemented** — **Strict chronological order** for the main execution path:
   - For screens: mount → effects → user events → validation → `lib/api` calls → navigation/toasts → cleanup.
   - For hooks: dependency changes → subscriptions → timers → async POST/GET → teardown.
   - For Express routers: middleware order → validation → controller → service → repository → response.

6. **Roles** — Which persona keys (`public`, `inspector`, `inspector_admin`, `decree_upload_department`, `system_admin`) interact directly or indirectly.

## Anti-patterns

- Generic steps like “Network calls request remote data” without naming functions and endpoints.
- Documenting endpoints that do not exist in `back-end/src/**/routes*.js`.
- Skipping imports — every line that pulls a dependency must appear in **Libraries used**.

## Normalization marker

Normalized docs include `<!-- purpose-doc: normalized -->` at the top so [`generate-architecture-docs.mjs`](../scripts/generate-architecture-docs.mjs) skips overwriting them.
