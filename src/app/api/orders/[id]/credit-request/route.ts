export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
// import { prisma } from '@/lib/prisma';
// import { getCurrentUser } from '@/lib/auth/session';

// TEMPORARILY DISABLED - Run database migration first:
// npx prisma db push
// Then uncomment this code

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({
    error: 'Credit request feature not yet available. Database migration pending.',
    creditRequests: [],
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({
    error: 'Credit request feature not yet available. Database migration pending.',
  }, { status: 503 });
}

/* ORIGINAL CODE - Uncomment after running: npx prisma db push

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;

    // Get credit requests for this order
    const creditRequests = await prisma.creditRequest.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      creditRequests: creditRequests.map(cr => ({
        ...cr,
        affectedItems: JSON.parse(cr.affectedItems),
        photoUrls: JSON.parse(cr.photoUrls),
        creditAmount: cr.creditAmount ? Number(cr.creditAmount) : null,
      })),
    });
  } catch (error) {
    console.error('Get credit requests error:', error);
    return NextResponse.json({ error: 'Failed to get credit requests' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;

    // Get the order and verify access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { retailer: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check user has access to this order
    if (user.role !== 'SUPERADMIN' && user.retailerId !== order.retailerId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check order is delivered
    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: 'Credit requests can only be submitted for delivered orders' },
        { status: 400 }
      );
    }

    // Check within 48 hours of delivery
    if (order.deliveredAt) {
      const hoursSinceDelivery = (Date.now() - order.deliveredAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceDelivery > 48) {
        return NextResponse.json(
          { error: 'Credit requests must be submitted within 48 hours of delivery' },
          { status: 400 }
        );
      }
    }

    const body = await request.json();
    const { description, affectedItems, photoUrls } = body;

    // Validate required fields
    if (!description || !affectedItems || !Array.isArray(affectedItems) || affectedItems.length === 0) {
      return NextResponse.json(
        { error: 'Description and affected items are required' },
        { status: 400 }
      );
    }

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json(
        { error: 'At least one photo is required' },
        { status: 400 }
      );
    }

    // Create credit request
    const creditRequest = await prisma.creditRequest.create({
      data: {
        orderId,
        requestedById: user.id,
        description,
        affectedItems: JSON.stringify(affectedItems),
        photoUrls: JSON.stringify(photoUrls),
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      creditRequest: {
        ...creditRequest,
        affectedItems: JSON.parse(creditRequest.affectedItems),
        photoUrls: JSON.parse(creditRequest.photoUrls),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create credit request error:', error);
    return NextResponse.json({ error: 'Failed to create credit request' }, { status: 500 });
  }
}

*/
