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

    if (action === 'update-amount') {
      const { retailerName, amount } = body;
      if (!retailerName || amount === undefined) {
        return NextResponse.json({ error: 'retailerName and amount required' }, { status: 400 });
      }

      // Find orders for this retailer
      const orders = await prisma.order.findMany({
        where: {
          retailer: { name: { contains: retailerName, mode: 'insensitive' } },
        },
        include: { retailer: { select: { name: true } } },
      });

      if (orders.length === 0) {
        return NextResponse.json({ error: `No orders found for retailer: ${retailerName}` }, { status: 404 });
      }

      // Update all matching orders
      const updated = await prisma.order.updateMany({
        where: { id: { in: orders.map(o => o.id) } },
        data: { totalAmount: amount },
      });

      return NextResponse.json({
        success: true,
        message: `Updated ${updated.count} order(s) for ${orders[0].retailer.name} to amount ${amount}`,
        updated: updated.count,
      });
    }

    if (action === 'bulk-update-case-prices') {
      const { prices } = body;
      if (!prices || !Array.isArray(prices)) {
        return NextResponse.json({ error: 'prices array required' }, { status: 400 });
      }

      const results: { name: string; status: string; price?: number }[] = [];

      for (const { name, price } of prices) {
        if (!name || price === undefined || price === null || price === '') {
          continue; // Skip entries without price
        }

        // Find retailer by name (case-insensitive partial match)
        const retailer = await prisma.retailer.findFirst({
          where: { name: { contains: name.trim(), mode: 'insensitive' } },
        });

        if (retailer) {
          await prisma.retailer.update({
            where: { id: retailer.id },
            data: { casePrice: parseFloat(price) },
          });
          results.push({ name: retailer.name, status: 'updated', price: parseFloat(price) });
        } else {
          results.push({ name, status: 'not found' });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Processed ${results.length} retailers`,
        results,
      });
    }

    if (action === 'list-retailers') {
      const retailers = await prisma.retailer.findMany({
        select: { id: true, name: true, code: true, casePrice: true },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ retailers });
    }

    return NextResponse.json({
      error: 'Specify action: "delete-cancelled", "list-orders", "update-amount", "bulk-update-case-prices", or "list-retailers"',
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
