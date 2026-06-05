/**
 * Generic error reporter contract. Swap the implementation to Sentry / Datadog / Axiom later
 * without touching domain code.
 */
export class ErrorReporter {
  /**
   * @param {unknown} _err
   * @param {{
   *   requestId?: string | null,
   *   userId?: string | null,
   *   route?: string | null,
   *   extra?: Record<string, unknown>,
   * }} [_context]
   * @returns {Promise<void>}
   */
  async capture(_err, _context = {}) {}

  get providerName() {
    return 'noop';
  }
}

export class NoopErrorReporter extends ErrorReporter {}

/**
 * Stub for future Sentry wiring. Intentionally not importing `@sentry/node` — adding it is a
 * follow-up when we're ready to pay for Sentry usage.
 */
export class SentryErrorReporter extends ErrorReporter {
  constructor() {
    super();
  }
  get providerName() {
    return 'sentry';
  }
}
