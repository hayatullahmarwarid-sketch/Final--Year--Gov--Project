/**
 * Legacy hook name kept for call sites. Browser `pageshow` / bfcache handling is not used on native.
 * Sensitive fields are already scoped to screen state; no-op here.
 */
export function useClearSensitiveOnWebRestore(_clear: () => void): void {}
