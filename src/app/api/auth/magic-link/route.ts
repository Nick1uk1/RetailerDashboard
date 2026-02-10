export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createMagicLink } from '@/lib/auth/magic-link';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await createMagicLink(email.toLowerCase().trim());

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json(
      { error: 'Failed to send magic link' },
      { status: 500 }
    );
  }
}
