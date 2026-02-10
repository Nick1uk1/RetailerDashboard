export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink } from '@/lib/auth/magic-link';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const result = await verifyMagicLink(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Create session
    const sessionToken = await createSession(result.userId!);
    await setSessionCookie(sessionToken);

    // Get user to determine redirect
    const user = await prisma.retailerUser.findUnique({
      where: { id: result.userId! },
      select: { role: true, passwordHash: true },
    });

    // If user has no password, redirect to setup page
    let redirectTo: string;
    if (!user?.passwordHash) {
      redirectTo = '/setup-password';
    } else if (user?.role === 'SUPERADMIN') {
      redirectTo = '/superadmin-order';
    } else {
      redirectTo = '/catalog';
    }

    return NextResponse.json({
      success: true,
      message: user?.passwordHash ? 'Successfully logged in' : 'Please set up your password',
      redirectTo,
    });
  } catch (error) {
    console.error('Verify error:', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
