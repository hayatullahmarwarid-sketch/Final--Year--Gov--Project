<!-- purpose-doc: normalized -->
# System Admin Staff Management Screen (`users.tsx`)

## Scenario
The system admin is responsible for creating and managing staff accounts (inspector admins, department officers, other system admins). This screen lists all staff members, each showing their name, email, role, and active status. The admin can:

- **Create a new staff member** – a form where the admin enters name, email, role, and a password that must comply with the platform’s password policy. On creation, a portal password is generated and displayed so the new staff member can log in and be forced to change their password.
- **Edit a staff member** – change the role, name, or active status of an existing staff member.
- **Retrieve portal password** – for a given staff member, the admin can view the one‑time portal password that was last generated, in case the staff member lost it.

Every sensitive action requires the admin to re‑verify their own credentials via `verifySuperAdminLogin`. The screen reads the JWT access token from secure storage to authenticate API calls.

## What it does
The screen uses `useSystemAdminRemote` to access the current staff list and to trigger re‑fetches after mutations. It renders each staff member as an `AppPressable` row, styled with `Brand`, `FormColors`, and theme tokens (`palette`, `radius`, `spacing`, `touchTarget`, `typography`). The UI context (`useSystemAdminUi`) provides theme overrides.

**Create Staff flow:**
- A modal form collects name, email, role, and password.
- The password is validated locally via `isPasswordPolicyValid`.
- The role string is converted to the API role key via `staffRoleToApiRoleKey`.
- Before calling the API, `verifySuperAdminLogin(adminPassword)` confirms the admin’s identity.
- On success, `createStaff(payload)` returns the new staff member, and `getStaffPortalPassword(newStaffId)` generates the portal password, which is displayed once in a dialog.

**Edit Staff flow:**
- Tapping a row opens an edit modal pre‑filled with the staff member’s data.
- Changes are mapped through `staffMemberToStaffUser` for the API payload.
- `patchStaff(id, changes)` updates the record.
- A toast confirms success.

**Retrieve password flow:**
- The admin taps a “Show Portal Password” button on a staff row.
- After re‑verifying via `verifySuperAdminLogin`, `getStaffPortalPassword(staffId)` fetches the password and displays it.

The JWT access token is obtained from `getJwtAccessToken` and attached to all API calls (likely within the API functions themselves). `showToast` provides feedback for all actions.

## Libraries used
- **@expo/vector-icons** – role icons, edit/delete/password icons.
- **react** – core rendering.
- **@/lib/adapters/toast** (`showToast`) – success and error feedback.
- **@/components/ui/AppPressable** – pressable rows and buttons.
- **@/constants/brand** / **@/constants/form** – design tokens.
- **@/hooks/use-app-translation** – localised labels.
- **@/contexts/system-admin-ui-context** (`useSystemAdminUi`) – UI theme.
- **@/lib/theme** – `palette`, `radius`, `spacing`, `touchTarget`, `typography`.
- **@/contexts/system-admin-remote-context** (`useSystemAdminRemote`) – staff list and refresh.
- **@/lib/api/system-admin** – `createStaff`, `getStaffPortalPassword`, `patchStaff`.
- **@/lib/api/jwt-session-storage** (`getJwtAccessToken`) – retrieves the current access token.
- **@/lib/system-admin-mapper** – `staffMemberToStaffUser`, `staffRoleToApiRoleKey`.
- **@/lib/validation/password-policy** (`isPasswordPolicyValid`) – validates password strength.
- **@/services/admin-portal-auth** (`verifySuperAdminLogin`) – re‑verifies the admin’s password before sensitive actions.

## Logic implemented
1. On mount, the staff list is fetched via the remote context (`remote.fetchStaffList()` or similar).
2. The list is rendered with each row showing name, email, role badge, and active status.
3. **Create staff:**
   - “Create Staff” button opens a modal.
   - Admin fills in name, email, selects a role from a dropdown (mapped to API key via `staffRoleToApiRoleKey`), and enters a password.
   - Password is validated with `isPasswordPolicyValid`. If invalid, an inline error is shown.
   - On submit, `verifySuperAdminLogin(adminPassword)` is called first. If failed, the flow stops.
   - `createStaff(staffMemberToStaffUser(formData))` creates the account.
   - `getStaffPortalPassword(newStaff.id)` retrieves the portal password.
   - The password is displayed in a dialog with a “Copy” button. On dismiss, the list refreshes.
4. **Edit staff:**
   - Tapping a row opens an edit modal with pre‑filled data.
   - Admin changes role, name, or active status.
   - On save, `patchStaff(id, changes)` is called. Toast confirms the update.
5. **Retrieve password:**
   - Tapping the password icon on a row prompts `verifySuperAdminLogin`.
   - On success, `getStaffPortalPassword(staffId)` is called and the password is shown.
6. The JWT token is included in API headers (handled inside the API functions via `getJwtAccessToken`).
7. All operations show success or error feedback via `showToast`.

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Primary UI for system administration features.
