import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logging';
import type { LinnworksOrderPayload, CreateOrderResult, LinnworksOrderInfo, LinnworksClient } from './types';

export class MockLinnworksClient implements LinnworksClient {
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

  async getOrdersById(pkOrderIds: string[]): Promise<LinnworksOrderInfo[]> {
    logger.info('MOCK: Getting orders by ID', { count: pkOrderIds.length });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Return mock data - all orders have invoice printed
    return pkOrderIds.map(id => ({
      pkOrderId: id,
      referenceNumber: '',
      status: 1,
      invoicePrinted: true,
      labelPrinted: false,
      processed: false,
    }));
  }

  async getProcessedOrderIds(pkOrderIds: string[]): Promise<string[]> {
    logger.info('MOCK: Checking processed orders', { count: pkOrderIds.length });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Return empty - no orders processed in mock
    return [];
  }

  async unparkOrder(pkOrderId: string): Promise<boolean> {
    logger.info('MOCK: Unparking order', { pkOrderId });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return true;
  }
}
