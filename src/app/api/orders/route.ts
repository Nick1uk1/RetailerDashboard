export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { createOrder } from '@/lib/orders/service';
import { logger } from '@/lib/utils/logging';

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
    logger.info('Order creation attempt', { userId: user?.id, email: user?.email, retailerId: user?.retailerId, role: user?.role });

    if (!user) {
      logger.warn('Order creation failed: unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { lines, poNumber, notes, requestedDeliveryDate, storeRetailerId } = body;
    logger.info('Order payload received', { lineCount: lines?.length, poNumber, storeRetailerId });

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one line item' },
        { status: 400 }
      );
    }

    // Determine which retailer to use for the order
    let orderRetailerId: string;

    // Superadmins can order for any store
    if (user.role === 'SUPERADMIN') {
      if (!storeRetailerId) {
        return NextResponse.json(
          { error: 'Please select a store to order for' },
          { status: 400 }
        );
      }

      // Verify the store exists and is active
      const targetRetailer = await prisma.retailer.findUnique({
        where: { id: storeRetailerId },
      });

      if (!targetRetailer || !targetRetailer.active) {
        return NextResponse.json(
          { error: 'Selected store not found or inactive' },
          { status: 400 }
        );
      }

      orderRetailerId = storeRetailerId;
      logger.info('Superadmin creating order for store', { superadminId: user.id, retailerId: orderRetailerId });
    } else {
      // Regular users
      if (!user.retailerId) {
        logger.warn('Order creation failed: no retailerId', { userId: user.id, role: user.role });
        return NextResponse.json(
          { error: 'Account not associated with a store' },
          { status: 403 }
        );
      }

      orderRetailerId = user.retailerId;

      // Check if ordering for a different store in same chain
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
    }

    const result = await createOrder({
      retailerId: orderRetailerId,
      lines,
      poNumber,
      notes,
      requestedDeliveryDate,
    });

    if (!result.success) {
      logger.warn('Order validation failed', { errors: result.errors });
      return NextResponse.json(
        { errors: result.errors },
        { status: 400 }
      );
    }

    logger.info('Order creation successful', {
      orderId: result.order?.id,
      isIdempotent: result.isIdempotent,
    });

    return NextResponse.json({
      order: result.order,
      isIdempotent: result.isIdempotent,
    });
  } catch (error) {
    logger.error('Order creation error', error as Error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
