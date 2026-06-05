/**
 * Mirrors backend `department-settings.lib` / `reference-generation.service` formatting for UI previews.
 */
export function generateReference(prefix: string, year: number, sequence: number, pad = 5): string {
  const p = String(prefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
  return `${p}-${year}-${String(sequence).padStart(pad, '0')}`;
}

export function generateDepartmentCodeReference(deptCode: string, year: number, sequence: number, pad = 5): string {
  const c = String(deptCode)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
  return `${c}-${year}-${String(sequence).padStart(pad, '0')}`;
}
