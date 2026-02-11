import { prisma } from '@/lib/prisma';
import { getLinnworksClient } from './index';
import { logger } from '@/lib/utils/logging';

export interface SyncResult {
  synced: number;
  errors: number;
  details: {
    orderId: string;
    externalRef: string;
    previousStatus: string;
    newStatus: string;
  }[];
}

export async function syncOrderStatuses(): Promise<SyncResult> {
  const result: SyncResult = {
    synced: 0,
    errors: 0,
    details: [],
  };

  try {
    const client = getLinnworksClient();

    // Get all orders that need status checking (not delivered, not cancelled, not failed)
    const ordersToSync = await prisma.order.findMany({
      where: {
        status: {
          in: ['CREATED_IN_LINNWORKS', 'PROCESSING'],
        },
        linnworksMap: {
          isNot: null,
        },
      },
      include: {
        linnworksMap: true,
      },
    });

    if (ordersToSync.length === 0) {
      logger.info('No orders to sync');
      return result;
    }

    const pkOrderIds = ordersToSync
      .filter(o => o.linnworksMap?.pkOrderId)
      .map(o => o.linnworksMap!.pkOrderId);

    logger.info(`Syncing ${pkOrderIds.length} orders with Linnworks`);

    // Get order details from Linnworks (open orders)
    const linnworksOrders = await client.getOrdersById(pkOrderIds);

    // Check which orders have been processed (dispatched)
    const processedIds = await client.getProcessedOrderIds(pkOrderIds);
    const processedSet = new Set(processedIds);

    logger.info(`Found ${processedSet.size} processed orders in Linnworks`);

    // Update statuses based on Linnworks data
    for (const order of ordersToSync) {
      const pkOrderId = order.linnworksMap?.pkOrderId;
      if (!pkOrderId) continue;

      const linnworksOrder = linnworksOrders.find(lo => lo.pkOrderId === pkOrderId);
      let newStatus: string | null = null;

      // Check if order has been dispatched (processed) - this means PROCESSING
      if (processedSet.has(pkOrderId)) {
        if (order.status !== 'PROCESSING' && order.status !== 'DELIVERED') {
          newStatus = 'PROCESSING';
          logger.info(`Order ${order.externalRef} has been processed in Linnworks → PROCESSING`);
        }
      }
      // Check if invoice has been printed (also processing)
      else if (linnworksOrder?.invoicePrinted) {
        if (order.status === 'CREATED_IN_LINNWORKS') {
          newStatus = 'PROCESSING';
          logger.info(`Order ${order.externalRef} has invoice printed → PROCESSING`);
        }
      }

      if (newStatus && newStatus !== order.status) {
        try {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: newStatus },
          });

          await prisma.orderEventLog.create({
            data: {
              orderId: order.id,
              eventType: 'ORDER_PROCESSING',
              payloadJson: JSON.stringify({
                previousStatus: order.status,
                newStatus,
                source: 'linnworks_sync',
                invoicePrinted: linnworksOrder?.invoicePrinted,
                processed: processedSet.has(pkOrderId),
              }),
            },
          });

          result.synced++;
          result.details.push({
            orderId: order.id,
            externalRef: order.externalRef,
            previousStatus: order.status,
            newStatus,
          });

          logger.info(`Order ${order.externalRef} updated: ${order.status} → ${newStatus}`);
        } catch (err) {
          result.errors++;
          logger.error(`Failed to update order ${order.externalRef}`, err as Error);
        }
      }
    }

    logger.info(`Sync complete: ${result.synced} updated, ${result.errors} errors`);
    return result;

  } catch (error) {
    logger.error('Order sync failed', error as Error);
    throw error;
  }
}
