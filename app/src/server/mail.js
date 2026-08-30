import nodemailer from 'nodemailer';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) {
    throw new Error('SMTP_HOST is not configured');
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function sendMagicLink(email, link) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) {
    throw new Error('SMTP_FROM is not configured');
  }

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Your Conference Badges login link',
    text: `Click this link to sign in to Conference Badges:\n\n${link}\n\nThis link expires in 15 minutes.`,
    html: `<p>Click this link to sign in to Conference Badges:</p><p><a href="${link}">${link}</a></p><p>This link expires in 15 minutes.</p>`,
  });
}
