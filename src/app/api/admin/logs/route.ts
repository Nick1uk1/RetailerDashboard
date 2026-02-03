import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('eventType');
    const orderId = searchParams.get('orderId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const where: {
      eventType?: string;
      orderId?: string;
    } = {};

    if (eventType) {
      where.eventType = eventType;
    }
    if (orderId) {
      where.orderId = orderId;
    }

    const logs = await prisma.orderEventLog.findMany({
      where,
      include: {
        order: {
          select: {
            externalRef: true,
            retailer: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Admin logs error:', error);
    return NextResponse.json(
      { error: 'Failed to load logs' },
      { status: 500 }
    );
  }
}
