import { NoopErrorReporter } from './ErrorReporter.js';

/** @type {import('./ErrorReporter.js').ErrorReporter | null} */
let cached = null;

/** Returns the active error reporter singleton. */
export function getErrorReporter() {
  if (cached) return cached;
  cached = new NoopErrorReporter();
  return cached;
}

export function resetErrorReporterForTests() {
  cached = null;
}
