export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        retailer: user.retailer
          ? {
              id: user.retailer.id,
              name: user.retailer.name,
              code: user.retailer.code,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({ user: null });
  }
}
