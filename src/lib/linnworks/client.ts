import { logger } from '@/lib/utils/logging';
import type {
  LinnworksAuthResponse,
  LinnworksOrderPayload,
  CreateOrderResult,
  LinnworksClient,
  LinnworksOrderInfo,
} from './types';

const AUTH_URL = 'https://api.linnworks.net/api/Auth/AuthorizeByApplication';
const TOKEN_CACHE_DURATION_MS = 55 * 60 * 1000; // 55 minutes

interface TokenCache {
  token: string;
  server: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function authenticate(): Promise<TokenCache> {
  const appId = process.env.LINNWORKS_APP_ID;
  const appSecret = process.env.LINNWORKS_APP_SECRET;
  const installToken = process.env.LINNWORKS_INSTALL_TOKEN;

  if (!appId || !appSecret || !installToken) {
    throw new Error('Linnworks credentials not configured');
  }

  logger.info('Authenticating with Linnworks API');

  const params = new URLSearchParams({
    applicationId: appId,
    applicationSecret: appSecret,
    token: installToken,
  });

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error('Linnworks authentication failed', undefined, {
      status: response.status,
      response: text,
    });
    throw new Error(`Linnworks authentication failed: ${response.status}`);
  }

  const data: LinnworksAuthResponse = await response.json();

  tokenCache = {
    token: data.Token,
    server: data.Server,
    expiresAt: Date.now() + TOKEN_CACHE_DURATION_MS,
  };

  logger.info('Linnworks authentication successful', { server: data.Server });

  return tokenCache;
}

async function getAuthToken(): Promise<TokenCache> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache;
  }
  return authenticate();
}

function invalidateToken(): void {
  tokenCache = null;
}

export class RealLinnworksClient implements LinnworksClient {
  async createOrders(orders: LinnworksOrderPayload[]): Promise<CreateOrderResult[]> {
    return this.createOrdersWithRetry(orders, false);
  }

  async getOrdersById(pkOrderIds: string[]): Promise<LinnworksOrderInfo[]> {
    if (pkOrderIds.length === 0) return [];

    const auth = await getAuthToken();
    const url = `${auth.server}/api/Orders/GetOrdersById`;

    const params = new URLSearchParams({
      pkOrderIds: JSON.stringify(pkOrderIds),
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth.token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error('Linnworks GetOrdersById failed', undefined, {
        status: response.status,
        response: text,
      });
      throw new Error(`Linnworks GetOrdersById failed: ${response.status}`);
    }

    const orders = await response.json();

    return orders.map((order: Record<string, unknown>) => {
      const generalInfo = order.GeneralInfo as Record<string, unknown> || {};
      return {
        pkOrderId: String(order.OrderId || ''),
        referenceNumber: String(generalInfo.ReferenceNum || ''),
        status: Number(generalInfo.Status || 0),
        invoicePrinted: Boolean(generalInfo.InvoicePrinted),
        labelPrinted: Boolean(generalInfo.LabelPrinted),
        processed: false, // Open orders are not processed
      };
    });
  }

  async getProcessedOrderIds(pkOrderIds: string[]): Promise<string[]> {
    if (pkOrderIds.length === 0) return [];

    const auth = await getAuthToken();
    const processedIds: string[] = [];

    // Check each order in processed orders
    for (const pkOrderId of pkOrderIds) {
      try {
        const url = `${auth.server}/api/ProcessedOrders/GetProcessedOrderDetails`;
        const params = new URLSearchParams({
          pkOrderId: pkOrderId,
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': auth.token,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.OrderId) {
            processedIds.push(pkOrderId);
          }
        }
      } catch (err) {
        // Order not found in processed orders, that's fine
      }
    }

    return processedIds;
  }

  private async createOrdersWithRetry(
    orders: LinnworksOrderPayload[],
    isRetry: boolean
  ): Promise<CreateOrderResult[]> {
    const auth = await getAuthToken();
    const url = `${auth.server}/api/Orders/CreateOrders`;

    logger.info('Sending orders to Linnworks', {
      orderCount: orders.length,
      references: orders.map(o => o.ReferenceNumber),
    });

    const params = new URLSearchParams({
      orders: JSON.stringify(orders),
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth.token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (response.status === 401 && !isRetry) {
      logger.warn('Linnworks token expired, re-authenticating');
      invalidateToken();
      return this.createOrdersWithRetry(orders, true);
    }

    if (!response.ok) {
      const text = await response.text();
      logger.error('Linnworks CreateOrders failed', undefined, {
        status: response.status,
        response: text,
      });
      throw new Error(`Linnworks CreateOrders failed: ${response.status}`);
    }

    const results = await response.json();
    logger.info('Linnworks orders created', {
      resultCount: results.length,
      rawResults: JSON.stringify(results),
    });

    // Linnworks returns an array of order IDs (strings/GUIDs)
    return results.map((result: string | Record<string, unknown>, index: number) => {
      // Handle simple string array response (most common)
      if (typeof result === 'string') {
        return {
          pkOrderId: result,
          referenceNumber: orders[index].ReferenceNumber,
          success: true,
        };
      }

      // Handle object response format
      const pkOrderId = result.pkOrderId || result.pkOrderID || result.OrderId || result.orderId;

      if (!pkOrderId) {
        logger.error('Linnworks response missing pkOrderId', undefined, { result });
        return {
          pkOrderId: '',
          referenceNumber: orders[index].ReferenceNumber,
          success: false,
          error: result.Error || result.error || 'Missing order ID in response',
        };
      }

      return {
        pkOrderId: String(pkOrderId),
        referenceNumber: orders[index].ReferenceNumber,
        success: true,
      };
    });
  }
}
