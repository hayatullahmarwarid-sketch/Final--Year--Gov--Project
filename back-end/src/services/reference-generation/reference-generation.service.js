import { ReferenceSequenceCounterModel } from '../../../database/models/reference-sequence-counter.model.js';
import { deptUploadSettingsRepository } from '../../../database/repositories/dept-upload-settings.repository.js';
import {
  formatCertificateReference,
  formatDepartmentCodeReference,
  formatOfficialDecreeReference,
  formatReportReference,
  kabulCalendarYear,
  normalizeDeptCode,
  normalizeRefPrefix,
} from '../department-settings/department-settings.lib.js';

/** @typedef {'decree' | 'certificate' | 'report'} ReferenceKind */

const COUNTER_KEYS = {
  decree: 'dept_upload:decree',
  certificate: 'dept_upload:certificate',
  report: 'dept_upload:report',
};

/**
 * Bump sequence atomically. When `yearlyReset` is true, seq resets to 1 each Kabul calendar year.
 * When false, seq never resets; `year` field tracks issuance year for labeling only on first allocate after toggle.
 *
 * @param {ReferenceKind} kind
 * @param {import('mongoose').ClientSession | null | undefined} session
 * @returns {Promise<{ year: number, seq: number }>}
 */
async function bumpSequence(kind, session) {
  const settings = await deptUploadSettingsRepository.findSingletonLean();
  const system = settings.system && typeof settings.system === 'object' ? settings.system : {};
  const yearlyReset = system.sequenceYearlyReset !== false;
  const yearNow = kabulCalendarYear();

  const id = COUNTER_KEYS[kind];

  if (yearlyReset) {
    const updated = await ReferenceSequenceCounterModel.findOneAndUpdate(
      { _id: id },
      [
        {
          $set: {
            year: yearNow,
            seq: {
              $cond: [{ $eq: [{ $ifNull: ['$year', -1] }, yearNow] }, { $add: [{ $ifNull: ['$seq', 0] }, 1] }, 1],
            },
          },
        },
      ],
      { upsert: true, new: true, session: session ?? null },
    ).lean();
    return { year: yearNow, seq: updated?.seq ?? 1 };
  }

  const pipeline = [
    {
      $set: {
        year: yearNow,
        seq: { $add: [{ $ifNull: ['$seq', 0] }, 1] },
      },
    },
  ];
  const updated = await ReferenceSequenceCounterModel.findOneAndUpdate({ _id: id }, pipeline, {
    upsert: true,
    new: true,
    session: session ?? null,
  }).lean();

  return { year: yearNow, seq: updated?.seq ?? 1 };
}

/**
 * Next official decree reference using configured reference prefix.
 * @param {import('mongoose').ClientSession | null | undefined} session
 */
export async function allocateDecreeOfficialReference(session) {
  const settings = await deptUploadSettingsRepository.findSingletonLean();
  const dept = settings.department && typeof settings.department === 'object' ? settings.department : {};
  const refPrefix = normalizeRefPrefix(typeof dept.refPrefix === 'string' ? dept.refPrefix : 'SHD');
  const deptCode = normalizeDeptCode(typeof dept.deptCode === 'string' ? dept.deptCode : 'DEPT');

  const { year, seq } = await bumpSequence('decree', session);
  const reference = formatOfficialDecreeReference(refPrefix, year, seq);
  return {
    reference,
    departmentCodeReference: formatDepartmentCodeReference(deptCode, year, seq),
    refPrefix,
    deptCode,
    year,
    sequence: seq,
  };
}

/**
 * Preview the next decree reference without consuming a sequence number.
 */
export async function peekNextDecreeOfficialReference() {
  const settings = await deptUploadSettingsRepository.findSingletonLean();
  const dept = settings.department && typeof settings.department === 'object' ? settings.department : {};
  const refPrefix = normalizeRefPrefix(typeof dept.refPrefix === 'string' ? dept.refPrefix : 'SHD');
  const deptCode = normalizeDeptCode(typeof dept.deptCode === 'string' ? dept.deptCode : 'DEPT');
  const system = settings.system && typeof settings.system === 'object' ? settings.system : {};
  const yearlyReset = system.sequenceYearlyReset !== false;
  const yearNow = kabulCalendarYear();

  const doc = await ReferenceSequenceCounterModel.findById(COUNTER_KEYS.decree).lean();
  let nextSeq = 1;
  if (doc && typeof doc.seq === 'number') {
    if (yearlyReset) {
      nextSeq = doc.year === yearNow ? doc.seq + 1 : 1;
    } else {
      nextSeq = doc.seq + 1;
    }
  }
  const reference = formatOfficialDecreeReference(refPrefix, yearNow, nextSeq);
  return {
    nextIndex: nextSeq,
    displayLabel: reference,
    departmentCodeReference: formatDepartmentCodeReference(deptCode, yearNow, nextSeq),
  };
}

/**
 * @param {import('mongoose').ClientSession | null | undefined} session
 */
export async function allocateCertificateOfficialReference(session) {
  const settings = await deptUploadSettingsRepository.findSingletonLean();
  const dept = settings.department && typeof settings.department === 'object' ? settings.department : {};
  const refPrefix = normalizeRefPrefix(typeof dept.refPrefix === 'string' ? dept.refPrefix : 'SHD');

  const { year, seq } = await bumpSequence('certificate', session);
  const reference = formatCertificateReference(refPrefix, year, seq);
  return { reference, refPrefix, year, sequence: seq };
}

/**
 * @param {import('mongoose').ClientSession | null | undefined} session
 */
export async function allocateReportOfficialReference(session) {
  const settings = await deptUploadSettingsRepository.findSingletonLean();
  const dept = settings.department && typeof settings.department === 'object' ? settings.department : {};
  const refPrefix = normalizeRefPrefix(typeof dept.refPrefix === 'string' ? dept.refPrefix : 'SHD');

  const { year, seq } = await bumpSequence('report', session);
  const reference = formatReportReference(refPrefix, year, seq);
  return { reference, refPrefix, year, sequence: seq };
}

export { normalizeDeptCode, normalizeRefPrefix, kabulCalendarYear };
