export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth/session';

export async function GET() {
  try {
    await requireSuperadmin();

    const creditRequests = await prisma.creditRequest.findMany({
      include: {
        order: {
          include: {
            retailer: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            lines: {
              select: {
                skuCode: true,
                skuName: true,
                qty: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get user names for requestedById
    const userIds = [...new Set(creditRequests.map(cr => cr.requestedById))];
    const users = await prisma.retailerUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return NextResponse.json({
      creditRequests: creditRequests.map(cr => ({
        id: cr.id,
        orderId: cr.orderId,
        orderRef: cr.order.externalRef,
        retailer: cr.order.retailer,
        requestedBy: userMap.get(cr.requestedById) || { name: 'Unknown', email: '' },
        description: cr.description,
        affectedItems: JSON.parse(cr.affectedItems),
        photoUrls: JSON.parse(cr.photoUrls),
        status: cr.status,
        creditAmount: cr.creditAmount ? Number(cr.creditAmount) : null,
        resolutionNote: cr.resolutionNote,
        resolvedAt: cr.resolvedAt,
        createdAt: cr.createdAt,
        orderTotal: Number(cr.order.totalAmount),
        orderLines: cr.order.lines,
      })),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    console.error('Get credit requests error:', error);
    return NextResponse.json({ error: 'Failed to get credit requests' }, { status: 500 });
  }
}
