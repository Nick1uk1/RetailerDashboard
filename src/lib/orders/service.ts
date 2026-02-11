import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/utils/logging';
import { getLinnworksClient, buildLinnworksPayload } from '@/lib/linnworks';
import { generateExternalRef } from './idempotency';
import { validateRetailer, validateOrderLines, validateOrderTotal, type ValidationResult } from './validation';
import type { Order } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface OrderLineInput {
  skuCode: string;
  qty: number;
}

interface CreateOrderInput {
  retailerId: string;
  lines: OrderLineInput[];
  poNumber?: string;
  notes?: string;
  requestedDeliveryDate?: string;
  isTest?: boolean;
}

interface CreateOrderResult {
  success: boolean;
  order?: Order;
  errors?: ValidationResult['errors'];
  isIdempotent?: boolean;
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  // Generate deterministic external ref for idempotency
  const externalRef = generateExternalRef({
    retailerId: input.retailerId,
    lines: input.lines,
    poNumber: input.poNumber,
    requestedDeliveryDate: input.requestedDeliveryDate,
  });

  // Check for existing order with same externalRef (idempotency)
  const existingOrder = await prisma.order.findUnique({
    where: { externalRef },
    include: { lines: true, linnworksMap: true },
  });

  if (existingOrder) {
    logger.info('Idempotent order request - returning existing order', {
      orderId: existingOrder.id,
      externalRef,
    });
    return { success: true, order: existingOrder, isIdempotent: true };
  }

  // Validate retailer
  const retailer = await prisma.retailer.findUnique({
    where: { id: input.retailerId },
  });

  const retailerValidation = validateRetailer(retailer);
  if (!retailerValidation.valid) {
    return { success: false, errors: retailerValidation.errors };
  }

  // Load SKUs for validation
  const skuCodes = input.lines.map(l => l.skuCode);
  const skus = await prisma.sKU.findMany({
    where: { skuCode: { in: skuCodes } },
    include: { retailers: true },
  });

  const skuMap = new Map(skus.map(s => [s.skuCode, s]));

  // Validate order lines
  const linesValidation = validateOrderLines(input.lines, input.retailerId, skuMap);
  if (!linesValidation.valid) {
    return { success: false, errors: linesValidation.errors };
  }

  // Calculate prices and totals using retailer's casePrice
  const orderLines = input.lines.map(line => {
    const sku = skuMap.get(line.skuCode)!;
    const packSize = sku.packSize || 1;

    // Use retailer's casePrice if set, otherwise fall back to SKU base price
    let unitPrice: Decimal;
    if (retailer!.casePrice) {
      // casePrice is price per case, divide by packSize to get unit price
      unitPrice = new Decimal(retailer!.casePrice).div(packSize);
    } else {
      // Fall back to SKU-specific pricing
      const retailerSku = sku.retailers.find(
        rs => rs.retailerId === input.retailerId
      );
      unitPrice = new Decimal(retailerSku?.priceOverride ?? sku.basePrice);
    }

    const lineTotal = unitPrice.mul(line.qty);

    return {
      skuId: sku.id,
      skuCode: sku.skuCode, // Use canonical SKU code from database (with period for CASE items)
      skuName: sku.name,
      qty: line.qty,
      unitPrice,
      lineTotal,
    };
  });

  const totalAmount = orderLines.reduce(
    (sum, line) => sum.add(line.lineTotal),
    new Decimal(0)
  );

  // Check minimum order value
  const totalValidation = validateOrderTotal(totalAmount.toNumber());
  if (!totalValidation.valid) {
    return { success: false, errors: totalValidation.errors };
  }

  // Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        retailerId: input.retailerId,
        externalRef,
        poNumber: input.poNumber,
        notes: input.notes,
        requestedDeliveryDate: input.requestedDeliveryDate
          ? new Date(input.requestedDeliveryDate)
          : null,
        status: 'SUBMITTED',
        totalAmount,
        isTest: input.isTest ?? false,
        lines: {
          create: orderLines,
        },
      },
      include: {
        lines: true,
        retailer: true,
      },
    });

    // Log order creation
    await tx.orderEventLog.create({
      data: {
        orderId: newOrder.id,
        eventType: 'ORDER_CREATED',
        payloadJson: JSON.stringify({ externalRef }),
      },
    });

    return newOrder;
  });

  logger.info('Order created', {
    orderId: order.id,
    externalRef,
    totalAmount: totalAmount.toString(),
  });

  // Sync to Linnworks
  await syncOrderToLinnworks(order.id);

  // Refetch order with updated status
  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { lines: true, linnworksMap: true },
  });

  return { success: true, order: updatedOrder! };
}

export async function syncOrderToLinnworks(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      lines: { include: { sku: true } }, // Include SKU for linnworksStockItemId
      retailer: true,
      linnworksMap: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (order.linnworksMap) {
    logger.warn('Order already synced to Linnworks', {
      orderId,
      pkOrderId: order.linnworksMap.pkOrderId,
    });
    return;
  }

  // Log Linnworks request
  await prisma.orderEventLog.create({
    data: {
      orderId,
      eventType: 'LINNWORKS_REQUEST',
      payloadJson: JSON.stringify({ externalRef: order.externalRef }),
    },
  });

  try {
    const client = getLinnworksClient();
    const payload = buildLinnworksPayload(order);
    const results = await client.createOrders([payload]);
    const result = results[0];

    if (result.success && result.pkOrderId) {
      // Update order and create mapping
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'CREATED_IN_LINNWORKS' },
        });

        await tx.linnworksOrderMap.create({
          data: {
            orderId,
            pkOrderId: result.pkOrderId,
          },
        });

        await tx.orderEventLog.create({
          data: {
            orderId,
            eventType: 'LINNWORKS_SUCCESS',
            payloadJson: JSON.stringify({
              pkOrderId: result.pkOrderId,
            }),
          },
        });
      });

      logger.info('Order synced to Linnworks', {
        orderId,
        pkOrderId: result.pkOrderId,
      });

      // Explicitly unpark the order to ensure it's not in parked queue
      try {
        await client.unparkOrder(result.pkOrderId);
      } catch (unparkError) {
        logger.warn('Failed to unpark order, may need manual intervention', {
          orderId,
          pkOrderId: result.pkOrderId,
        });
      }
    } else {
      throw new Error(result.error || 'Linnworks returned no order ID');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'FAILED' },
      });

      await tx.orderEventLog.create({
        data: {
          orderId,
          eventType: 'LINNWORKS_FAILURE',
          payloadJson: JSON.stringify({ error: errorMessage }),
        },
      });
    });

    logger.error('Failed to sync order to Linnworks', error, { orderId });
  }
}

export async function retryOrder(orderId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { linnworksMap: true },
  });

  if (!order) {
    return { success: false, message: 'Order not found' };
  }

  if (order.linnworksMap) {
    return {
      success: false,
      message: 'Order already synced to Linnworks',
    };
  }

  if (order.status !== 'FAILED') {
    return {
      success: false,
      message: `Cannot retry order with status: ${order.status}`,
    };
  }

  // Log retry attempt
  await prisma.orderEventLog.create({
    data: {
      orderId,
      eventType: 'RETRY_ATTEMPT',
      payloadJson: null,
    },
  });

  logger.info('Retrying order sync', { orderId });

  await syncOrderToLinnworks(orderId);

  const updatedOrder = await prisma.order.findUnique({
    where: { id: orderId },
  });

  return {
    success: updatedOrder?.status === 'CREATED_IN_LINNWORKS',
    message: updatedOrder?.status === 'CREATED_IN_LINNWORKS'
      ? 'Order synced successfully'
      : 'Retry failed',
  };
}
