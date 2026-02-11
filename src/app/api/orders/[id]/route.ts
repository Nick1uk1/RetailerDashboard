export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Superadmin can view any order
    if (!user.retailerId) {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          lines: true,
          linnworksMap: true,
          retailer: { select: { name: true, code: true } },
          events: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ order });
    }

    // Check if user is part of a chain
    const userRetailer = await prisma.retailer.findUnique({
      where: { id: user.retailerId },
    });

    let whereClause: { id: string; retailerId: string } | { id: string; retailer: { groupName: string } };

    if (userRetailer?.groupName) {
      // Chain user - can view orders from any store in the chain
      whereClause = {
        id,
        retailer: {
          groupName: userRetailer.groupName,
        },
      };
    } else {
      // Single retailer
      whereClause = {
        id,
        retailerId: user.retailerId,
      };
    }

    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        lines: true,
        linnworksMap: true,
        events: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Order detail error:', error);
    return NextResponse.json(
      { error: 'Failed to load order' },
      { status: 500 }
    );
  }
}
