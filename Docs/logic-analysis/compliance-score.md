# “Compliance” score (inspector-admin tracking)

## Naming caveat

In this codebase, **“compliance” percentages shown on the inspector-admin implementation / tracking dashboards are derived from `InspectionAssignment.reporting.reviewScore`**, populated when an assignment is **finalized** through the submission review workflow—not from the automatic inspection audit score (`InspectionSubmission.autoScore`).

If `reviewScore` is missing at finalize time, tracking rows that rely on `complianceScoreFromAssignment` **skip** those assignments (`score === null` → `continue`).

## Source field

`inspector-admin-tracking.service.js` reads:

```30:35:back-end/src/modules/inspector-admin/inspector-admin-tracking.service.js
function complianceScoreFromAssignment(a) {
  const rep = a.reporting && typeof a.reporting === 'object' ? a.reporting : null;
  const v = rep && typeof rep.reviewScore === 'number' ? rep.reviewScore : null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}
```

So “compliance” in aggregates is **clamped to 0–100** and rounded to **one decimal**.

## How `reviewScore` gets set

On **finalize**, `InspectionSubmissionReviewWorkflow.finalize` writes:

```209:224:back-end/src/modules/inspections/inspection-submission-review.workflow.js
      await InspectionAssignmentModel.findByIdAndUpdate(
        assignmentId,
        {
          $set: {
            status: InspectionAssignmentStatus.FINALIZED,
            finalizedAt: now,
            reviewedByUserId: reviewerOid,
            reporting: {
              finalizedSubmissionId: new mongoose.Types.ObjectId(submissionId),
              finalizedAt: now,
              implementationSignals,
              reviewScore: mergedScore,
              reviewComment: mergedComment,
            },
```

Where `mergedScore` comes from the **explicit finalize `score`** argument or **`submission.review.score`** from a prior step—not from `autoScore`.

## Aggregation rules (national / zone tracking)

`InspectorAdminTrackingService.getNationalTrackingSummary`:

1. **Window:** `startDate` / `endDate` query params (ISO strings); defaults to **last 180 days** if omitted (`Date.now() - 180 * 86400000` through “now”).
2. **Rows:** `InspectionAssignment` with `status: FINALIZED`, `finalizedAt` in range, `isDeleted` not true; projection includes `finalizedAt`, `location`, `reporting`. Hard **limit 25000** documents per query.
3. **Per-row score:** `complianceScoreFromAssignment` as above; rows without numeric `reviewScore` are dropped.
4. **Zone bucketing:** Uses `zoneKeyFromLocation` / `extractPrimaryCityToken` on `assignment.location` with `AFGHANISTAN_ZONES`. Rows missing parseable zone/city are skipped.
5. **Incident definition:** `score < incidentThreshold` where threshold defaults to **70** (override via query).
6. **Zone-level `complianceAvg`:** Simple arithmetic mean of included scores (not weighted by quarter until quarterly breakdown).
7. **`incidentRatePct`:** `(incidentCount / inspectionsCount) * 100` per zone.
8. **Quarterly buckets:** Calendar quarters **by UTC month** via `quarterKeyFromDate` (`Q1`–`Q4`). Each quarter gets its own average compliance and incident rate.
9. **Trend labels:** `trendFromValues` compares average of first half vs second half of the **four quarterly compliance values** (not rolling windows).
10. **Net gain:** `netGainPct` compares **first vs last** quarterly compliance average in that fixed `Q1`–`Q4` array order (not chronological fiscal ordering beyond UTC quarter mapping).
11. **Top cities:** Cities with **≥ 2** inspections, sorted by compliance avg descending.

The mobile **implementation** screen loads this via `inspectorAdminApi.getTrackingSummary` / `getTrackingZone` when `usesLiveApi` is true (`app/inspector-admin/implementation.tsx`).

## Demo / offline “compliance” (different formula)

`data/inspector-admin-store.ts` defines `complianceByRegionFromIncidents`, which computes **100 − penalty** from mock **incident severity**—this is **not** the same as server tracking and is documented there as a helper for map demos.

## Needs verification

- Whether reviewers **always** supply a numeric score at finalize in production (if not, assignments contribute **nothing** to compliance averages).
