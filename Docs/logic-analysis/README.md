# System logic analysis

This folder documents **non-obvious business rules and metrics** as implemented in the repository. Each topic file cites the modules where behavior is defined.

| Topic | File |
| --- | --- |
| Decree “views” and engagement counting | [views-counting.md](./views-counting.md) |
| Database latency vs HTTP health signals | [database-latency.md](./database-latency.md) |
| “Compliance” in inspector-admin tracking | [compliance-score.md](./compliance-score.md) |
| Inspection audit score (auto, submit-time) | [audit-score.md](./audit-score.md) |
| Notifications creation and fan-out | [notifications-logic.md](./notifications-logic.md) |
| Dashboard snapshots, Prometheus HTTP timing | [dashboards-and-metrics.md](./dashboards-and-metrics.md) |
| Exam auto-grading and pass threshold | [exam-grading.md](./exam-grading.md) |
| Other rules (demo analytics, PDF/pages, etc.) | [other-business-logic.md](./other-business-logic.md) |

**Constraint:** analysis only—no runtime code was modified to produce these notes.
