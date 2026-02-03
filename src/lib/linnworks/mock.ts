import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logging';
import type { LinnworksOrderPayload, CreateOrderResult } from './types';

export class MockLinnworksClient {
  async createOrders(orders: LinnworksOrderPayload[]): Promise<CreateOrderResult[]> {
    logger.info('MOCK: Creating orders in Linnworks', {
      orderCount: orders.length,
      references: orders.map(o => o.ReferenceNumber),
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return orders.map(order => ({
      pkOrderId: uuidv4(),
      referenceNumber: order.ReferenceNumber,
      success: true,
    }));
  }
}
