/**
 * @param {Record<string, unknown> | null | undefined} user
 */
export function serializeStaffMember(user) {
  if (!user) return null;
  const id = user._id ? String(user._id) : null;
  const roleId = user.roleId ? String(user.roleId) : null;
  return {
    id,
    displayName: user.displayName ?? null,
    email: user.email ?? null,
    phoneE164: user.phoneE164 ?? null,
    preferredLocale: user.preferredLocale ?? 'ps',
    roleKey: user.roleKey ?? null,
    roleId,
    status: user.status ?? null,
    profile: user.profile ?? undefined,
    deactivatedAt: user.deactivatedAt ? new Date(user.deactivatedAt).toISOString() : null,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
  };
}
