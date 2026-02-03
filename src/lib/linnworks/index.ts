import { config } from '@/lib/config';
import { RealLinnworksClient } from './client';
import { MockLinnworksClient } from './mock';
import type { LinnworksClient } from './types';

export * from './types';
export { buildLinnworksPayload } from './payload';

let clientInstance: LinnworksClient | null = null;

export function getLinnworksClient(): LinnworksClient {
  if (!clientInstance) {
    const cfg = config();
    clientInstance = cfg.isLinnworksMocked
      ? new MockLinnworksClient()
      : new RealLinnworksClient();
  }
  return clientInstance;
}
