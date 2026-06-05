# Exam attempt grading (auto-score and pass)

## Single source of truth

`back-end/src/modules/exams/grading.service.js` — `gradeAttempt` — documented in-file as the **only** place to score attempts.

## Scoring

- **Per question:** Adds **points** to `score` when auto-gradable rules match; accumulates **`maxScore`** from each question’s `points` field.
- **MCQ:** Exact match of selected keys to `correctOptionKeys` (supports multi-select semantics described in code).
- **True/false:** Compare `booleanAnswer` to `correctBoolean`.
- **Essay:** **No** auto points; sets `needsManualGrading` true if any essay exists.

## Pass / fail

```77:78:back-end/src/modules/exams/grading.service.js
  const passPct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const passed = passPct >= passThresholdPct;
```

Default **`passThresholdPct` is 55** unless overridden in `options`.

## Relationship to certificates / workflows

Downstream issuance uses this service via public-users and certificate workflows; follow imports of `gradeAttempt` / `buildGradedAnswers` for call-specific behavior.

## Needs verification

- Whether exam definitions in admin UI always set **`points`** consistently so `maxScore` matches expectations.
