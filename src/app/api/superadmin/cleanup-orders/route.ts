export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth/session';

// TEMPORARY endpoint to cleanup orders - DELETE AFTER USE
export async function POST(request: NextRequest) {
  try {
    await requireSuperadmin();

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'delete-cancelled') {
      // Get cancelled order IDs first
      const cancelledOrders = await prisma.order.findMany({
        where: { status: 'CANCELLED' },
        select: { id: true },
      });

      const orderIds = cancelledOrders.map(o => o.id);

      if (orderIds.length === 0) {
        return NextResponse.json({ message: 'No cancelled orders found', deleted: 0 });
      }

      // Delete related records first
      await prisma.orderEventLog.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.linnworksOrderMap.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderLine.deleteMany({ where: { orderId: { in: orderIds } } });
      const result = await prisma.order.deleteMany({ where: { id: { in: orderIds } } });

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.count} cancelled orders`,
        deleted: result.count,
      });
    }

    if (action === 'list-orders') {
      const orders = await prisma.order.findMany({
        include: {
          retailer: { select: { name: true, code: true, casePrice: true } },
          lines: { select: { skuCode: true, skuName: true, qty: true, unitPrice: true, lineTotal: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return NextResponse.json({
        orders: orders.map(o => ({
          id: o.id,
          ref: o.externalRef,
          retailer: o.retailer.name,
          retailerCode: o.retailer.code,
          casePrice: o.retailer.casePrice,
          status: o.status,
          total: Number(o.totalAmount),
          lines: o.lines.map(l => ({
            sku: l.skuCode,
            name: l.skuName,
            qty: l.qty,
            unitPrice: Number(l.unitPrice),
            lineTotal: Number(l.lineTotal),
          })),
          createdAt: o.createdAt,
        })),
      });
    }

    return NextResponse.json({
      error: 'Specify action: "delete-cancelled" or "list-orders"',
    }, { status: 400 });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    console.error('Cleanup orders error:', error);
    return NextResponse.json({ error: 'Failed to cleanup orders' }, { status: 500 });
  }
}
