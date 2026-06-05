/**
 * @param {Record<string, unknown> | null | undefined} doc
 */
export function serializeDeptUploadSettings(doc) {
  const d = doc && typeof doc === 'object' ? doc : {};
  const department = d.department && typeof d.department === 'object' ? d.department : {};
  const system = d.system && typeof d.system === 'object' ? d.system : {};
  const notifications = d.notifications && typeof d.notifications === 'object' ? d.notifications : {};
  const storage = d.storage && typeof d.storage === 'object' ? d.storage : {};

  // Enforce Kabul strictly at the serialization boundary too.
  const tz = 'Asia/Kabul';

  const sessionTimeoutRaw =
    typeof system.sessionTimeoutMinutes === 'number' ? system.sessionTimeoutMinutes : 30;
  const sessionTimeoutMinutes = Math.min(120, Math.max(15, sessionTimeoutRaw));

  return {
    schemaVersion: typeof d.schemaVersion === 'number' ? d.schemaVersion : 1,
    department: {
      deptName: typeof department.deptName === 'string' ? department.deptName : 'Decree Upload Department',
      deptCode: typeof department.deptCode === 'string' ? department.deptCode : 'DUD',
      refPrefix: typeof department.refPrefix === 'string' ? department.refPrefix : 'SHD',
      contactEmail: typeof department.contactEmail === 'string' ? department.contactEmail : 'admin@decrees.gov.af',
    },
    system: {
      sessionTimeoutMinutes,
      sequenceYearlyReset: system.sequenceYearlyReset !== false,
      interfaceLanguage: typeof system.interfaceLanguage === 'string' ? system.interfaceLanguage : 'en',
      timezone: tz,
      dateFormat: typeof system.dateFormat === 'string' ? system.dateFormat : 'DD/MM/YYYY',
    },
    notifications,
    storage,
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
  };
}

