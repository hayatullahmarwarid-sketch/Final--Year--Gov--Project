# Inspection audit score (automatic, submit-time)

## Purpose

`computeInspectionAuditScore` produces a **baseline 0–100 score** from the inspection **template** and **answers** at **final submit** time. It is stored on the submission as **`autoScore`** and is explicitly **not** the admin review score.

Schema documentation:

```37:41:back-end/database/models/inspection-submission.model.js
    /**
     * Automatic audit score computed at submit-time from template + answer payloads.
     * This is NOT an admin review score; it's a machine-computed baseline to support
     * dashboard averages and initial "Audit Score" display before an admin reviews.
     */
    autoScore: { type: Number, default: null, min: 0, max: 100 },
```

## Where it is computed

`InspectorsService.submitInspection`:

- Loads the assignment’s template and normalizes answers.
- Calls `computeInspectionAuditScore({ template, answers })` inside **try/catch**; on any failure, **`autoScore` is `null`** (scoring must not block submit).

## Formula (high level)

Implementation: `back-end/src/modules/inspections/inspection-audit-score.js`.

1. **Items:** Every template item under `template.sections[].items[]` with both `sectionKey` and `itemKey` contributes **exactly one point** toward **`total`** (missing answers still increase `total`; unanswered items contribute 0 earned points).

2. **Earned points per item type:**
   - **`checklist`:** `valueBoolean === true` → 1; else if selected option looks like **yes** → 1; **no** → 0; else 0.
   - **`checkbox` / `dropdown`:** ≥1 `selectedOptionKeys` → 1 else 0.
   - **`photo` / `photo_required`:** ≥1 `evidenceFileIds` → 1 else 0.
   - **`gps`:** `valueText` matches lat,lng regex → 1 else 0.
   - **`signature`:** non-empty `valueText` → 1 else 0.
   - **`date`:** non-empty text **or** `valueDate` set → 1 else 0.
   - **`number`:** finite numeric → 1 else 0.
   - **`rating`:** linear interpolation between `validation.min` / `validation.max` (defaults **1..5**) mapped to **0..1** earned for that item.
   - **`text` / default:** non-empty trimmed `valueText` → 1 else 0.

3. **Final score:** `Math.round((earned / total) * 100)`, clamped 0–100. If **`total === 0`** (no scorable items), returns **0**.

## Relationship to “compliance” tracking

- **Audit score (`autoScore`):** machine, submission-level.
- **Tracking “compliance” charts:** use **`assignment.reporting.reviewScore`** after admin finalize (see [compliance-score.md](./compliance-score.md)).

They are **different fields** unless a workflow explicitly aligns them.

## Storage

- Persisted on **`inspection_submissions.autoScore`** for the final submission row (see submit flow in `inspectors.service.js`).

## Needs verification

- Which UI surfaces display **`autoScore`** vs **`review.score`** vs **`reporting.reviewScore`** end-to-end (mobile inspector-admin screens vary).
