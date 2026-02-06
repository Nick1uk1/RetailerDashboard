import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Webhook secret for security (set this in your .env file)
const WEBHOOK_SECRET = process.env.LINNWORKS_WEBHOOK_SECRET || 'your-webhook-secret';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (passed as header or query param)
    const secret = request.headers.get('x-webhook-secret') ||
                   request.nextUrl.searchParams.get('secret');

    if (secret !== WEBHOOK_SECRET) {
      console.log('Webhook: Invalid secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Linnworks webhook received:', JSON.stringify(body, null, 2));

    const { event, pkOrderId, orderReference, data } = body;

    // Find order by Linnworks ID or external reference
    let order = null;

    if (pkOrderId) {
      const mapping = await prisma.linnworksOrderMap.findFirst({
        where: { pkOrderId },
        include: { order: true },
      });
      order = mapping?.order;
    }

    if (!order && orderReference) {
      order = await prisma.order.findUnique({
        where: { externalRef: orderReference },
      });
    }

    if (!order) {
      console.log('Webhook: Order not found', { pkOrderId, orderReference });
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Determine new status based on event type
    let newStatus: string | null = null;
    let eventType: string | null = null;

    switch (event) {
      case 'INVOICE_PRINTED':
      case 'invoice_printed':
      case 'PO_GENERATED':
      case 'po_generated':
        newStatus = 'PROCESSING';
        eventType = 'ORDER_PROCESSING';
        break;

      case 'DISPATCHED':
      case 'dispatched':
      case 'SHIPPED':
      case 'shipped':
        newStatus = 'SHIPPED';
        eventType = 'ORDER_SHIPPED';
        break;

      case 'DELIVERED':
      case 'delivered':
        newStatus = 'DELIVERED';
        eventType = 'ORDER_DELIVERED';
        break;

      case 'CANCELLED':
      case 'cancelled':
        newStatus = 'CANCELLED';
        eventType = 'ORDER_CANCELLED';
        break;

      default:
        console.log('Webhook: Unknown event type', event);
        return NextResponse.json({
          success: true,
          message: 'Event received but no action taken',
          event
        });
    }

    // Update order status
    const previousStatus = order.status;

    await prisma.order.update({
      where: { id: order.id },
      data: { status: newStatus },
    });

    // Log the event
    await prisma.orderEventLog.create({
      data: {
        orderId: order.id,
        eventType: eventType,
        payloadJson: JSON.stringify({
          previousStatus,
          newStatus,
          source: 'linnworks_webhook',
          event,
          ...data,
        }),
      },
    });

    console.log(`Webhook: Order ${order.externalRef} updated from ${previousStatus} to ${newStatus}`);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderReference: order.externalRef,
      previousStatus,
      newStatus,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Also support GET for webhook verification
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge');

  if (challenge) {
    // Return challenge for webhook verification
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    status: 'Linnworks webhook endpoint active',
    events: ['INVOICE_PRINTED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
  });
}
