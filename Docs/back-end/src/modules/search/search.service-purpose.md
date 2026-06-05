<!-- purpose-doc: normalized -->
# Search Service (`search.service.js`)

## Scenario

Business rules for this domain execute when controllers, jobs, or other services call into this service layer.

## What it does

The file exports the following surface (representative `export` lines):

- `export class SearchService {`
- `export const searchService = new SearchService();`

Path in repo: `back-end/src/modules/search/search.service.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `search.service.js`.

## Libraries used

- **mongoose** – third-party dependency for this module.
- **../../../database/repositories/decree.repository.js** (`{ decreeRepository }`) – relative project import.
- **../../../database/repositories/exam.repository.js** (`{ examRepository }`) – relative project import.
- **../../../database/models/decree.model.js** (`{ DecreeModel }`) – relative project import.
- **../../../database/models/decree-version.model.js** (`{ DecreeVersionModel }`) – relative project import.
- **../../../database/models/exam.model.js** (`{ ExamModel }`) – relative project import.
- **../shared/enums/decree-lifecycle.js** (`{ DecreeLifecycle }`) – relative project import.
- **../shared/enums/exam-lifecycle.js** (`{ ExamLifecycle }`) – relative project import.
- **../decree-upload/serializers/decree.serializer.js** (`{ buildDecreeNumberLabel }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
