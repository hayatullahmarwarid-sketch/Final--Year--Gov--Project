import { sendSmtpMail } from '../../services/email/smtp-mailer.service.js';

/**
 * Handler for `email.send` jobs. Data contract is explicit + small so both BullMQ and the
 * in-process fallback can ship the same JSON.
 *
 * @typedef {object} EmailSendJobData
 * @property {string} to
 * @property {string} subject
 * @property {string} [text]
 * @property {string} [html]
 * @property {string} [correlationId]
 *
 * @param {{ id: string | undefined, name: string, data: EmailSendJobData }} job
 */
export async function emailSendHandler(job) {
  const { to, subject, text, html } = job.data;
  await sendSmtpMail({ to, subject, text: text ?? '', html: html ?? text ?? '' });
}
