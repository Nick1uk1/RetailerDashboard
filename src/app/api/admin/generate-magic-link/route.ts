export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { requireSuperadmin } from '@/lib/auth/session';

// Admin endpoint to generate magic links for testing store logins
// Only accessible by superadmins
export async function POST(request: NextRequest) {
  try {
    const superadmin = await requireSuperadmin();

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.retailerUser.findUnique({
      where: { email },
      include: { retailer: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.active) {
      return NextResponse.json({ error: 'User is inactive' }, { status: 400 });
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

    const magicLink = `${cfg.appUrl}/verify?token=${token}`;

    // Create response
    const response = NextResponse.json({
      success: true,
      email,
      userName: user.name,
      retailerName: user.retailer?.name || 'N/A (Superadmin)',
      magicLink,
      expiresAt: expiresAt.toISOString(),
      // Debug info
      _debug: {
        superadminEmail: superadmin.email,
        targetEmail: email,
      },
    });

    // Store superadmin email in cookie so they can return to their account
    // Only set if logging into a different user
    if (email !== superadmin.email) {
      response.cookies.set('superadmin_return_email', superadmin.email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    console.error('Generate magic link error:', error);
    return NextResponse.json({ error: 'Failed to generate magic link' }, { status: 500 });
  }
}
