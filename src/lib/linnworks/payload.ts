import type { Order, OrderLine, Retailer, SKU } from '@prisma/client';
import { config } from '@/lib/config';
import type { LinnworksOrderPayload, LinnworksOrderItem, LinnworksAddress, LinnworksOrderNote } from './types';

interface OrderLineWithSKU extends OrderLine {
  sku: SKU;
}

interface OrderWithLines extends Order {
  lines: OrderLineWithSKU[];
  retailer: Retailer;
}

export function buildLinnworksPayload(order: OrderWithLines): LinnworksOrderPayload {
  const cfg = config();
  const taxCostInclusive = cfg.taxMode === 'INCLUSIVE';
  const taxRate = taxCostInclusive ? 20 : 0;

  const orderItems: LinnworksOrderItem[] = order.lines.map((line) => {
    // Calculate number of cases (qty is stored as total items, divide by packSize for cases)
    const packSize = line.sku.packSize || 1;
    const caseQty = Math.round(line.qty / packSize);

    // Price per case (unitPrice is per item, multiply by packSize for case price)
    const pricePerCase = Number(line.unitPrice) * packSize;

    const item: LinnworksOrderItem = {
      ItemNumber: line.skuCode,
      SKU: line.skuCode, // Must match Linnworks inventory SKU exactly (with period for CASE items)
      ChannelSKU: line.skuCode,
      ItemTitle: line.skuName,
      Qty: caseQty, // Send number of cases, not individual items
      PricePerUnit: pricePerCase, // Price per case
      TaxRate: taxRate,
      TaxCostInclusive: taxCostInclusive,
      LinePercentDiscount: 0,
    };

    // Use StockItemId via BinRack for guaranteed correct inventory linking
    if (line.sku.linnworksStockItemId) {
      item.BinRack = line.sku.linnworksStockItemId;
    }

    return item;
  });

  // DispatchBy is required by Linnworks - default to 5 days from now if not specified
  const dispatchBy = order.requestedDeliveryDate
    ? order.requestedDeliveryDate.toISOString()
    : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const payload: LinnworksOrderPayload = {
    Source: 'MANUAL',
    SubSource: order.retailer.code,
    ReferenceNumber: order.externalRef,
    ExternalReference: order.externalRef,
    ReceivedDate: order.createdAt.toISOString(),
    DispatchBy: dispatchBy,
    Currency: 'GBP',
    ChannelBuyerName: order.retailer.name,
    OrderItems: orderItems,
    // Order state: UNPAID but NOT parked
    PaymentStatus: 'UNPAID',
    PaidAmount: 0,
    Status: 0, // 0 = Unpaid
    Locked: false, // false = NOT parked/locked
    HoldOrCancel: false, // false = don't hold the order
    // Link SKUs automatically by matching SKU codes
    AutomaticallyLinkBySKU: true,
  };

  // Add notes as external notes
  if (order.notes) {
    const externalNote: LinnworksOrderNote = {
      Note: order.notes,
      NoteEntryDate: order.createdAt.toISOString(),
      NoteUserName: 'Retail Portal',
      IsInternal: false, // External note
    };
    payload.Notes = [externalNote];
  }

  // Add delivery and billing address from retailer
  const address: LinnworksAddress = {
    FullName: order.retailer.name,
    Company: order.retailer.name,
    Address1: order.retailer.addressLine1 || '',
    Address2: order.retailer.addressLine2 || '',
    Address3: order.retailer.addressLine3 || '',
    Town: order.retailer.city || '',
    Region: order.retailer.county || '',
    PostCode: order.retailer.postcode || '',
    Country: order.retailer.country || 'United Kingdom',
    PhoneNumber: order.retailer.phone || '',
    EmailAddress: order.retailer.contactEmail,
  };

  payload.DeliveryAddress = address;
  payload.BillingAddress = address;

  return payload;
}
