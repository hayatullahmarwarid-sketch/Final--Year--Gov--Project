import nodemailer from 'nodemailer';
import { getEnv } from '../../config/env.js';
import { getLogger } from '../../config/logger.js';
import { AppError } from '../../core/errors/app-error.js';
import { HttpStatus } from '../../core/errors/http-status.js';

/** @type {import('nodemailer').Transporter | null} */
let cachedTransport = null;

export function resetSmtpTransportCache() {
  cachedTransport = null;
}

/**
 * @returns {boolean}
 */
export function isOutboundEmailConfigured() {
  const env = getEnv();
  return Boolean(env.SMTP_HOST?.trim() && env.SMTP_PORT && env.MAIL_FROM?.trim());
}

function getTransport() {
  if (cachedTransport) return cachedTransport;
  const env = getEnv();
  if (!isOutboundEmailConfigured()) {
    throw new AppError('Outbound email is not configured', {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'EMAIL_NOT_CONFIGURED',
    });
  }
  const host = /** @type {string} */ (env.SMTP_HOST?.trim());
  const port = /** @type {number} */ (env.SMTP_PORT);
  const secure = env.SMTP_SECURE;
  const requireTLS =
    env.SMTP_REQUIRE_TLS !== undefined ? env.SMTP_REQUIRE_TLS : !secure && port === 587;

  /** @type {import('nodemailer').TransportOptions} */
  const options = {
    host,
    port,
    secure,
    requireTLS,
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  };
  if (env.SMTP_TLS_REJECT_UNAUTHORIZED === false) {
    options.tls = { rejectUnauthorized: false };
  }
  cachedTransport = nodemailer.createTransport(options);
  return cachedTransport;
}

/**
 * Verifies SMTP login/connect (nodemailer `verify()`). Resets the cached transport on failure
 * so the next send attempt builds a fresh socket.
 * @returns {Promise<void>}
 */
export async function verifyOutboundSmtpConnection() {
  const transport = getTransport();
  try {
    await transport.verify();
  } catch (err) {
    resetSmtpTransportCache();
    throw err;
  }
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} opts
 */
export async function sendSmtpMail(opts) {
  const env = getEnv();
  const transport = getTransport();
  const logger = getLogger();
  const from = /** @type {string} */ (env.MAIL_FROM?.trim());
  try {
    await transport.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
  } catch (err) {
    resetSmtpTransportCache();
    const smtp =
      err && typeof err === 'object'
        ? {
            code: /** @type {{ code?: string }} */ (err).code,
            command: /** @type {{ command?: string }} */ (err).command,
            responseCode: /** @type {{ responseCode?: number }} */ (err).responseCode,
            response: /** @type {{ response?: string }} */ (err).response,
          }
        : {};
    logger.error({ err, to: opts.to, smtp }, 'smtp_send_failed');
    throw new AppError('Could not send email', {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'EMAIL_SEND_FAILED',
    });
  }
}
