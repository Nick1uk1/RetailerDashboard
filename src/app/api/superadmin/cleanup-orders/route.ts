export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth/session';

// GET endpoint to update case prices - just visit this URL while logged in as superadmin
export async function GET() {
  try {
    await requireSuperadmin();

    const priceList: [string, number][] = [
      ["Budgens Castle Acre", 24.9],
      ["Pomeroy", 24.9],
      ["Tufnell Park", 23.4],
      ["Hampstead Local", 24.9],
      ["Arbour Farm", 24.9],
      ["Chessington", 23.4],
      ["Washingpool", 24.9],
      ["Weybridge", 24.9],
      ["Broadstairs", 23.4],
      ["Gipsy Hill", 24.9],
      ["Hockenhull", 24.9],
      ["Crouch End", 23.4],
      ["Westlands", 23.4],
      ["Plumpton", 23.4],
      ["Primrose", 24.9],
      ["Scotts", 23.4],
      ["Corby", 24.9],
      ["Lower Morden", 24.9],
      ["Ducks Farm", 24.9],
      ["Loddington", 24.9],
      ["Simply Fresh", 24.9],
      ["Brockley", 23.4],
      ["Frilford", 23.4],
      ["St Albans", 23.4],
      ["Graddons", 24.3],
      ["Harvest N1", 24.9],
      ["Eton", 23.4],
      ["Go Puff", 21.42],
      ["Hinchley", 23.4],
      ["Country Market", 24.9],
      ["Horizon", 22.5],
      ["East Finchley", 23.4],
      ["Daisy", 23.4],
      ["Leominster", 23.4],
      ["Cholmondeley", 24.9],
      ["Powderham", 23.4],
      ["Bleadons", 24.9],
      ["Clifton Greens", 23.4],
      ["Harvest N16", 23.4],
      ["Khindas", 23.4],
      ["Tates", 23.4],
      ["Artisan Food", 23.4],
      ["Handcross", 23.4],
      ["Casey Fields", 24.9],
      ["Connect", 22.8],
      ["Ascott", 23.4],
      ["Goldsmiths", 23.4],
      ["Cannells", 24.9],
      ["Market Rasen", 23.4],
      ["Winning Post", 23.4],
      ["Ruskington", 23.4],
      ["Haxey", 23.4],
      ["Cotswold", 19.5],
      ["Miara", 23.4],
      ["Applegarth", 24.9],
      ["New House Farm", 24.9],
      ["Evergreen", 24.9],
      ["Stores Deli", 24.9],
    ];

    const results: { name: string; status: string; price?: number }[] = [];

    for (const [name, price] of priceList) {
      const retailer = await prisma.retailer.findFirst({
        where: { name: { contains: name.trim(), mode: 'insensitive' } },
      });

      if (retailer) {
        await prisma.retailer.update({
          where: { id: retailer.id },
          data: { casePrice: price },
        });
        results.push({ name: retailer.name, status: 'updated', price });
      } else {
        results.push({ name, status: 'not found' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.filter(r => r.status === 'updated').length} retailers`,
      results,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return NextResponse.json({ error: 'Failed to update prices' }, { status: 500 });
  }
}

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
      // Hardcoded price list
      const priceList: [string, number][] = [
        ["Budgens Castle Acre", 24.9],
        ["Pomeroy", 24.9],
        ["Tufnell Park", 23.4],
        ["Hampstead Local", 24.9],
        ["Arbour Farm", 24.9],
        ["Chessington", 23.4],
        ["Washingpool", 24.9],
        ["Weybridge", 24.9],
        ["Broadstairs", 23.4],
        ["Gipsy Hill", 24.9],
        ["Hockenhull", 24.9],
        ["Crouch End", 23.4],
        ["Westlands", 23.4],
        ["Plumpton", 23.4],
        ["Primrose", 24.9],
        ["Scotts", 23.4],
        ["Corby", 24.9],
        ["Lower Morden", 24.9],
        ["Ducks Farm", 24.9],
        ["Loddington", 24.9],
        ["Simply Fresh", 24.9],
        ["Brockley", 23.4],
        ["Frilford", 23.4],
        ["St Albans", 23.4],
        ["Graddons", 24.3],
        ["Harvest N1", 24.9],
        ["Eton", 23.4],
        ["Go Puff", 21.42],
        ["Hinchley", 23.4],
        ["Country Market", 24.9],
        ["Horizon", 22.5],
        ["East Finchley", 23.4],
        ["Daisy", 23.4],
        ["Leominster", 23.4],
        ["Cholmondeley", 24.9],
        ["Powderham", 23.4],
        ["Bleadons", 24.9],
        ["Clifton Greens", 23.4],
        ["Harvest N16", 23.4],
        ["Khindas", 23.4],
        ["Tates", 23.4],
        ["Artisan Food", 23.4],
        ["Handcross", 23.4],
        ["Casey Fields", 24.9],
        ["Connect", 22.8],
        ["Ascott", 23.4],
        ["Goldsmiths", 23.4],
        ["Cannells", 24.9],
        ["Market Rasen", 23.4],
        ["Winning Post", 23.4],
        ["Ruskington", 23.4],
        ["Haxey", 23.4],
        ["Cotswold", 19.5],
        ["Miara", 23.4],
        ["Applegarth", 24.9],
        ["New House Farm", 24.9],
        ["Evergreen", 24.9],
        ["Stores Deli", 24.9],
      ];

      const results: { name: string; status: string; price?: number }[] = [];

      for (const [name, price] of priceList) {
        const retailer = await prisma.retailer.findFirst({
          where: { name: { contains: name.trim(), mode: 'insensitive' } },
        });

        if (retailer) {
          await prisma.retailer.update({
            where: { id: retailer.id },
            data: { casePrice: price },
          });
          results.push({ name: retailer.name, status: 'updated', price });
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
