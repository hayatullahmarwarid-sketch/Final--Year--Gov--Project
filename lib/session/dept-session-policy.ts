/** Session timeout from department settings (minutes); drives idle logout + JWT refresh policy. */
let sessionTimeoutMinutes: number | null = null;

export function setDeptSessionTimeoutMinutes(minutes: number | null): void {
  sessionTimeoutMinutes = typeof minutes === 'number' && Number.isFinite(minutes) ? minutes : null;
}

export function getDeptSessionTimeoutMinutes(): number | null {
  return sessionTimeoutMinutes;
}
