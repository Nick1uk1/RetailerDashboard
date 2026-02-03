import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { createOrder } from '@/lib/orders/service';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user.retailerId) {
      return NextResponse.json(
        { error: 'Superadmin accounts cannot access orders this way' },
        { status: 403 }
      );
    }

    // Check if user is part of a chain
    const userRetailer = await prisma.retailer.findUnique({
      where: { id: user.retailerId },
    });

    let whereClause: { retailerId: string } | { retailer: { groupName: string } };

    if (userRetailer?.groupName) {
      // Chain user - show all orders in the chain
      whereClause = {
        retailer: {
          groupName: userRetailer.groupName,
        },
      };
    } else {
      // Single retailer
      whereClause = {
        retailerId: user.retailerId,
      };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        lines: true,
        linnworksMap: true,
        retailer: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Orders list error:', error);
    return NextResponse.json(
      { error: 'Failed to load orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!user.retailerId) {
      return NextResponse.json(
        { error: 'Superadmin accounts cannot create orders' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { lines, poNumber, notes, requestedDeliveryDate, storeRetailerId } = body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one line item' },
        { status: 400 }
      );
    }

    // Determine which retailer to use for the order
    let orderRetailerId = user.retailerId;

    if (storeRetailerId && storeRetailerId !== user.retailerId) {
      // Verify user can order for this store (same chain)
      const [userRetailer, targetRetailer] = await Promise.all([
        prisma.retailer.findUnique({ where: { id: user.retailerId } }),
        prisma.retailer.findUnique({ where: { id: storeRetailerId } }),
      ]);

      if (!userRetailer?.groupName || !targetRetailer?.groupName) {
        return NextResponse.json(
          { error: 'Cannot place orders for other stores' },
          { status: 403 }
        );
      }

      if (userRetailer.groupName !== targetRetailer.groupName) {
        return NextResponse.json(
          { error: 'Store is not in your chain' },
          { status: 403 }
        );
      }

      orderRetailerId = storeRetailerId;
    }

    const result = await createOrder({
      retailerId: orderRetailerId,
      lines,
      poNumber,
      notes,
      requestedDeliveryDate,
    });

    if (!result.success) {
      return NextResponse.json(
        { errors: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      order: result.order,
      isIdempotent: result.isIdempotent,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
