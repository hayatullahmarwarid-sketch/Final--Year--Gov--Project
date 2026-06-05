<!-- purpose-doc: normalized -->
# Inspector Admin Submissions Screen (`submissions.tsx`)

## Scenario
The admin needs to review inspection submissions sent by field inspectors. This screen lists all submissions, each showing the inspector’s name, the template used, submission date, and status (e.g., “Pending Review”, “Approved”, “Rejected”). The admin can tap a submission to open a detailed review sheet (`SubmissionReviewSheet`), where they can see the filled‑out inspection form, compare it with the template, and either approve or reject the submission with comments. Rejected submissions are sent back to the inspector for correction.

## What it does
The component uses `useInspectorAdminWorkspace` to fetch the list of submissions and to perform approval/rejection actions. It renders the submissions in a `FlatList`; each item is an `AppPressable` row that opens the `SubmissionReviewSheet` modal. The review sheet displays all answers, possibly highlighting missing or problematic fields. The admin can add a note, then tap “Approve” or “Reject.” The modal calls the workspace’s `approveSubmission(id)` or `rejectSubmission(id, note)`, updates the list optimistically, and shows a toast. The screen also allows filtering submissions by status (e.g., show only pending). All labels are translated.

## Libraries used
- **@expo/vector-icons** – status icons, approve/reject icons.
- **react** / **react-native** – core UI.
- **@/components/inspector-admin/SubmissionReviewSheet** – the detailed review modal.
- **@/components/ui/AppPressable** – pressable rows.
- **@/hooks/use-app-translation** – localised strings.
- **@/hooks/use-inspector-admin-workspace** – submissions data and actions.
- **@/lib/adapters/toast** (`showToast`) – feedback.

## Logic implemented
1. On mount, the screen fetches submissions from the workspace (`workspace.submissions`).
2. The list is displayed with a filter toggle (Pending / All).
3. Each submission row shows:
   - Inspector name.
   - Template title.
   - Date submitted.
   - Status badge (Pending, Approved, Rejected).
4. Tapping a row opens `SubmissionReviewSheet` as a modal or bottom sheet, passing the submission data.
5. Inside the review sheet:
   - The inspection form is rendered with fields and the inspector’s answers.
   - The admin reviews and can enter a comment in a text field.
   - Buttons: “Approve” and “Reject”.
   - On “Approve”: `workspace.approveSubmission(submissionId)` is called; sheet closes, toast “Submission approved”.
   - On “Reject”: `workspace.rejectSubmission(submissionId, note)` with the comment; toast “Submission rejected and returned to inspector”.
6. The list updates locally to reflect the new status.
7. Any errors during review are shown with `showToast`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
