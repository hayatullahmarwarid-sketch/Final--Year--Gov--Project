<!-- purpose-doc: normalized -->
# Email Send Job Handler (`email-send.handler.js`)

## Scenario
Sending emails (verification codes, password reset links, notifications) can be slow due to SMTP handshake and message delivery. To avoid making the user wait, the HTTP request merely enqueues an email job with the recipient, subject, and body, and then immediately returns a success response. This handler is the background worker that actually transmits the email via SMTP.

## What it does
The `emailSendHandler(job)` function receives a job payload containing email details: `to`, `subject`, `html` or `text`. It calls `sendSmtpMail(payload)` from the SMTP mailer service, which performs the actual transmission. The handler itself is just a bridge; it passes the job data directly to the mailer and lets any errors propagate back to the job queue for retry or logging.

## Libraries used
- **../../services/email/smtp-mailer.service.js** – `sendSmtpMail` function that dispatches the email.

## Logic implemented
1. Extract email options (`to`, `subject`, `html`, etc.) from `job.data`.
2. Call `await sendSmtpMail(job.data)`.
3. If sending succeeds, the handler returns; the job queue marks the job as done.
4. If the SMTP call fails (e.g., connection refused), the handler throws, and the queue may retry with backoff.
5. No additional logging or transformation is done here; the handler is kept minimal and stateless.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
