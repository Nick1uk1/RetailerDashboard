export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/session';

export async function GET() {
  try {
    await requireAdmin();

    const orders = await prisma.order.findMany({
      include: {
        retailer: true,
        lines: true,
        linnworksMap: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Admin orders error:', error);
    return NextResponse.json(
      { error: 'Failed to load orders' },
      { status: 500 }
    );
  }
}
