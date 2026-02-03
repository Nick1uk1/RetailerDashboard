import { logger } from '@/lib/utils/logging';
import { config } from '@/lib/config';

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('\n========================================');
    console.log('📧 EMAIL (Development Mode)');
    console.log('========================================');
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log('----------------------------------------');
    console.log(params.text);
    console.log('========================================\n');
    return;
  }

  // Production: placeholder for real email service
  // TODO: Integrate with SendGrid, AWS SES, or similar
  logger.warn('Email sending not configured for production', {
    to: params.to,
    subject: params.subject,
  });
}

export async function sendMagicLinkEmail(
  email: string,
  token: string
): Promise<void> {
  const cfg = config();
  const magicLink = `${cfg.appUrl}/verify?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Sign in to Retailer Portal',
    text: `Click this link to sign in to your account:\n\n${magicLink}\n\nThis link expires in ${cfg.magicLinkExpiryMinutes} minutes.\n\nIf you didn't request this email, you can safely ignore it.`,
    html: `
      <h1>Sign in to Retailer Portal</h1>
      <p>Click the link below to sign in to your account:</p>
      <p><a href="${magicLink}">Sign in to Retailer Portal</a></p>
      <p>Or copy and paste this URL into your browser:</p>
      <p>${magicLink}</p>
      <p><small>This link expires in ${cfg.magicLinkExpiryMinutes} minutes.</small></p>
      <p><small>If you didn't request this email, you can safely ignore it.</small></p>
    `,
  });
}
