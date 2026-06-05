---
name: Exam results question enrichment
description: Backend enriches getExamAttemptById with per-question answer details
---

## Rule
`getExamAttemptById` in `public-users.service.js` now fetches all exam questions (via `this.examQuestions.listByExamIdLean`) in parallel with the certificate query and returns a `questionsWithAnswers` array.

**Shape of each entry:**
```
{ questionId, order, stem, type, points, pointsEarned, options[{optionKey,label}],
  correctOptionKeys, selectedOptionKeys, isCorrect (bool|null), wasAnswered }
```

**Frontend:** `app/exam/[id]/results.tsx` parses `d.questionsWithAnswers` in the `useFocusEffect` handler, stores in state, and renders an expandable "Question Review" section with colour-coded correct/wrong/skip indicators.

**Why:** Teacher requested expandable dropdowns per question showing question text, user answer, and correct answer.

**How to apply:** The `questionsWithAnswers` field is always present in the response (empty array if no questions). Frontend gracefully hides the section when the array is empty (works for old attempts that pre-date this change).
