export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated. Please use the setup link from your email.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Hash and save password
    const passwordHash = await hashPassword(password);

    await prisma.retailerUser.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Determine redirect based on role
    const redirectTo = user.role === 'SUPERADMIN' ? '/superadmin-order' : '/catalog';

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      redirectTo,
    });
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}
