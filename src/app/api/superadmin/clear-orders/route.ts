export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth/session';

// TEMPORARY endpoint to clear all orders - DELETE AFTER USE
export async function POST() {
  try {
    await requireSuperadmin();

    // Delete in order due to foreign key constraints
    const deletedEvents = await prisma.orderEventLog.deleteMany({});
    const deletedMaps = await prisma.linnworksOrderMap.deleteMany({});
    const deletedLines = await prisma.orderLine.deleteMany({});
    const deletedOrders = await prisma.order.deleteMany({});

    return NextResponse.json({
      success: true,
      deleted: {
        orders: deletedOrders.count,
        lines: deletedLines.count,
        events: deletedEvents.count,
        linnworksMaps: deletedMaps.count,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    console.error('Clear orders error:', error);
    return NextResponse.json({ error: 'Failed to clear orders' }, { status: 500 });
  }
}
