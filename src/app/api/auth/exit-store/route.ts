export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { cookies } from 'next/headers';

// Endpoint to return to superadmin account after testing a store login
export async function POST() {
  try {
    const cookieStore = await cookies();
    const superadminEmail = cookieStore.get('superadmin_return_email')?.value;

    if (!superadminEmail) {
      return NextResponse.json(
        { error: 'No superadmin session to return to' },
        { status: 400 }
      );
    }

    // Verify the email belongs to an active superadmin
    const superadmin = await prisma.retailerUser.findUnique({
      where: { email: superadminEmail },
    });

    if (!superadmin || superadmin.role !== 'SUPERADMIN' || !superadmin.active) {
      // Clear invalid cookie
      cookieStore.delete('superadmin_return_email');
      return NextResponse.json(
        { error: 'Invalid superadmin session' },
        { status: 400 }
      );
    }

    // Generate magic link token for superadmin
    const token = randomBytes(32).toString('hex');
    const cfg = config();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.magicLinkToken.create({
      data: {
        email: superadminEmail,
        token,
        expiresAt,
      },
    });

    // Clear the return cookie
    cookieStore.delete('superadmin_return_email');

    const verifyUrl = `${cfg.appUrl}/verify?token=${token}`;

    return NextResponse.json({
      success: true,
      redirectUrl: verifyUrl,
    });
  } catch (error) {
    console.error('Exit store error:', error);
    return NextResponse.json(
      { error: 'Failed to return to superadmin account' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if exit store is available
export async function GET() {
  try {
    const cookieStore = await cookies();
    const superadminEmail = cookieStore.get('superadmin_return_email')?.value;

    return NextResponse.json({
      canExitStore: !!superadminEmail,
    });
  } catch {
    return NextResponse.json({ canExitStore: false });
  }
}
