import { config } from '@/lib/config';
import { logger } from '@/lib/utils/logging';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    logger.warn('RESEND_API_KEY not configured - email not sent', { to: options.to });
    console.log('=== EMAIL NOT SENT (no API key) ===');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('=====================================');
    return false;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Home Cooks <onboarding@resend.dev>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to send email via Resend', { error, to: options.to });
      return false;
    }

    logger.info('Email sent successfully', { to: options.to });
    return true;
  } catch (error) {
    logger.error('Email sending error', error as Error);
    return false;
  }
}

export async function sendMagicLinkEmail(email: string, token: string): Promise<boolean> {
  const cfg = config();
  const verifyUrl = `${cfg.appUrl}/verify?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: #122627; padding: 30px; text-align: center;">
          <h1 style="color: #FFFDF6; margin: 0; font-size: 24px;">Home Cooks</h1>
          <p style="color: rgba(255,253,246,0.7); margin: 8px 0 0 0;">Retailer Portal</p>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #122627; margin: 0 0 16px 0; font-size: 20px;">Sign in to your account</h2>
          <p style="color: #666; line-height: 1.6; margin: 0 0 24px 0;">
            Click the button below to sign in to your Home Cooks Retailer Portal account. This link will expire in ${cfg.magicLinkExpiryMinutes} minutes.
          </p>
          <a href="${verifyUrl}" style="display: inline-block; background: #122627; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Sign In
          </a>
          <p style="color: #999; font-size: 14px; margin: 24px 0 0 0; line-height: 1.5;">
            If you didn't request this email, you can safely ignore it.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verifyUrl}" style="color: #666; word-break: break-all;">${verifyUrl}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Sign in to Home Cooks Retailer Portal',
    html,
  });
}
