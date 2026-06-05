# Other notable business rules

## Decree upload: pagination by word count

When publishing, `computeLocalizedPageCounts` in `decree-upload.service.js` derives pages per locale as **`ceil(wordCount / 30)`** (minimum 1 when text exists). Words are split on whitespace after stripping HTML to plain text where needed.

## Demo inspector-admin analytics (`data/inspector-admin-store.ts`)

Helpers such as `buildDashboardAreaData` aggregate **mock** submissions/assignments by **ISO date string** (`toISOString().slice(0, 10)`).

`complianceByRegionFromIncidents` applies a **fixed penalty** per open incident by severity (high **12**, medium **6**, else **2**), then **`max(0, round(100 - penalty))`**. Used for **offline/demo** map shading—not the live API tracking pipeline.

## Role-based gates

Many routes use middleware (`authorize.middleware.js`, role-specific guards). Exact matrices are **per-route**; documentation lives implicitly next to each router. **Needs verification** for a full RBAC table beyond reading each `*.routes.js`.

## PDF / reporting exports

- Inspector-admin tracking PDF generation lives in `inspector-admin-tracking.service.js` (PDFKit layout for matrices).
- CSV exports in `inspector-admin-reports.service.js` pull **`reporting.reviewScore`** among columns when exporting finalized inspections.

## Weighted national average (mobile UI)

`app/inspector-admin/implementation.tsx` computes national average display as:

**Σ(zone.complianceAvg × zone.inspectionsCount) / Σ(inspectionsCount)** across zones with **non-zero** inspection counts—UI-layer only; server already sends zone-level averages.

---

When adding features, prefer extending the documented services (`grading.service.js`, `inspection-audit-score.js`, `inspector-admin-tracking.service.js`) rather than duplicating formulas.
