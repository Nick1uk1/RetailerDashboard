import { createHash } from 'crypto';

interface OrderLineInput {
  skuCode: string;
  qty: number;
}

interface ExternalRefInput {
  retailerId: string;
  lines: OrderLineInput[];
  poNumber?: string;
  requestedDeliveryDate?: string;
}

export function generateExternalRef(input: ExternalRefInput): string {
  // Sort lines by skuCode for deterministic ordering
  const sortedLines = [...input.lines].sort((a, b) =>
    a.skuCode.localeCompare(b.skuCode)
  );

  // Create a deterministic string from the input
  const dataString = JSON.stringify({
    retailerId: input.retailerId,
    lines: sortedLines.map(l => ({ sku: l.skuCode, qty: l.qty })),
    po: input.poNumber || '',
    date: input.requestedDeliveryDate || '',
  });

  // Generate hash
  const hash = createHash('sha256').update(dataString).digest('hex');
  const shortHash = hash.substring(0, 8).toUpperCase();

  // Format: RP-YYYYMMDD-XXXXXXXX
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  return `RP-${dateStr}-${shortHash}`;
}
