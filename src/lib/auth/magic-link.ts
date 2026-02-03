import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { sendMagicLinkEmail } from '@/lib/email';
import { logger } from '@/lib/utils/logging';

export async function createMagicLink(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  // Check if user exists
  const user = await prisma.retailerUser.findUnique({
    where: { email },
    include: { retailer: true },
  });

  if (!user) {
    // Don't reveal if email exists or not
    logger.info('Magic link requested for unknown email', { email });
    return {
      success: true,
      message: 'If this email is registered, a login link has been sent.',
    };
  }

  if (!user.active) {
    logger.info('Magic link requested for inactive user', { email });
    return {
      success: true,
      message: 'If this email is registered, a login link has been sent.',
    };
  }

  // SUPERADMIN users don't have a retailer - that's OK
  if (user.retailer && !user.retailer.active) {
    logger.info('Magic link requested for user with inactive retailer', { email });
    return {
      success: true,
      message: 'If this email is registered, a login link has been sent.',
    };
  }

  // Generate token
  const token = randomBytes(32).toString('hex');
  const cfg = config();
  const expiresAt = new Date(Date.now() + cfg.magicLinkExpiryMinutes * 60 * 1000);

  // Create magic link token
  await prisma.magicLinkToken.create({
    data: {
      email,
      token,
      expiresAt,
    },
  });

  // Send email
  await sendMagicLinkEmail(email, token);

  logger.info('Magic link created and sent', { email });

  return {
    success: true,
    message: 'If this email is registered, a login link has been sent.',
  };
}

export async function verifyMagicLink(token: string): Promise<{
  success: boolean;
  userId?: string;
  message: string;
}> {
  const magicLink = await prisma.magicLinkToken.findUnique({
    where: { token },
  });

  if (!magicLink) {
    return { success: false, message: 'Invalid or expired link' };
  }

  if (magicLink.used) {
    // Check if there's a recent valid session for this user (within 30 seconds)
    // This handles React Strict Mode double-calls
    const user = await prisma.retailerUser.findUnique({
      where: { email: magicLink.email },
    });
    if (user) {
      const recentSession = await prisma.session.findFirst({
        where: {
          userId: user.id,
          createdAt: { gt: new Date(Date.now() - 30 * 1000) },
          expiresAt: { gt: new Date() },
        },
      });
      if (recentSession) {
        // Session was just created - this is a double-call, return success
        return { success: true, userId: user.id, message: 'Successfully verified' };
      }
    }
    return { success: false, message: 'This link has already been used' };
  }

  if (magicLink.expiresAt < new Date()) {
    return { success: false, message: 'This link has expired' };
  }

  // Mark as used
  await prisma.magicLinkToken.update({
    where: { id: magicLink.id },
    data: { used: true },
  });

  // Find user
  const user = await prisma.retailerUser.findUnique({
    where: { email: magicLink.email },
  });

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  logger.info('Magic link verified', { email: magicLink.email });

  return {
    success: true,
    userId: user.id,
    message: 'Successfully verified',
  };
}
