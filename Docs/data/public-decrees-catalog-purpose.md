<!-- purpose-doc: normalized -->
# Public Decrees Catalog (`public-decrees-catalog.ts`)

## Scenario

Bundled or typed **data modules** are loaded when features need catalogues, stores, or model shapes shared across the app.

## What it does

The file exports the following surface (representative `export` lines):

- `export interface Decree {`
- `export interface Category {`
- `export const CATEGORIES: Category[] = [`
- `export const ALL_DECREES: Decree[] = CATEGORIES.flatMap((cat) => cat.decrees);`
- `export function getDecreeById(id: number): Decree | undefined {`
- `export function getCategoryById(id: string): Category | undefined {`
- `export function getDecreeByCategoryAndNumber(categoryId: string, number: number): Decree | undefined {`

Path in repo: `data/public-decrees-catalog.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `public-decrees-catalog.ts`.

## Libraries used

- **(none beyond language built-ins)** – the file only uses local control flow or relative imports not listed above.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
