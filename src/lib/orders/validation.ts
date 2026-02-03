import type { Retailer, SKU, RetailerSKU } from '@prisma/client';
import { config } from '@/lib/config';

interface OrderLineInput {
  skuCode: string;
  qty: number;
}

interface ValidationError {
  field: string;
  code: string;
  message: string;
}

interface SKUWithRetailer extends SKU {
  retailers: RetailerSKU[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateRetailer(retailer: Retailer | null): ValidationResult {
  const errors: ValidationError[] = [];

  if (!retailer) {
    errors.push({
      field: 'retailer',
      code: 'NOT_FOUND',
      message: 'Retailer not found',
    });
    return { valid: false, errors };
  }

  if (!retailer.active) {
    errors.push({
      field: 'retailer',
      code: 'INACTIVE',
      message: 'Retailer account is not active',
    });
  }

  // Require address to be set
  if (!retailer.addressLine1 || !retailer.city || !retailer.postcode) {
    errors.push({
      field: 'retailer',
      code: 'ADDRESS_REQUIRED',
      message: 'Please complete your store address in Profile before placing orders',
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateOrderLines(
  lines: OrderLineInput[],
  retailerId: string,
  skuMap: Map<string, SKUWithRetailer>
): ValidationResult {
  const errors: ValidationError[] = [];
  const cfg = config();

  if (!lines || lines.length === 0) {
    errors.push({
      field: 'lines',
      code: 'EMPTY',
      message: 'Order must contain at least one line item',
    });
    return { valid: false, errors };
  }

  lines.forEach((line, index) => {
    const fieldPrefix = `lines[${index}]`;

    // Check quantity is positive
    if (!line.qty || line.qty <= 0) {
      errors.push({
        field: `${fieldPrefix}.qty`,
        code: 'INVALID_QTY',
        message: 'Quantity must be greater than 0',
      });
      return;
    }

    // Check SKU exists
    const sku = skuMap.get(line.skuCode);
    if (!sku) {
      errors.push({
        field: `${fieldPrefix}.skuCode`,
        code: 'SKU_NOT_FOUND',
        message: `SKU ${line.skuCode} not found`,
      });
      return;
    }

    // Check SKU is active
    if (!sku.active) {
      errors.push({
        field: `${fieldPrefix}.skuCode`,
        code: 'SKU_INACTIVE',
        message: `SKU ${line.skuCode} is not active`,
      });
      return;
    }

    // Check SKU is available to this retailer
    const retailerSku = sku.retailers.find(
      rs => rs.retailerId === retailerId && rs.active
    );
    if (!retailerSku) {
      errors.push({
        field: `${fieldPrefix}.skuCode`,
        code: 'SKU_NOT_AVAILABLE',
        message: `SKU ${line.skuCode} is not available for this retailer`,
      });
      return;
    }

    // Check pack size requirement
    if (cfg.orderUnits === 'CASES_ONLY' && sku.packSize > 1) {
      if (line.qty % sku.packSize !== 0) {
        errors.push({
          field: `${fieldPrefix}.qty`,
          code: 'INVALID_PACK_SIZE',
          message: `Quantity for ${line.skuCode} must be a multiple of pack size ${sku.packSize}`,
        });
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

export function validateOrderTotal(totalAmount: number): ValidationResult {
  const errors: ValidationError[] = [];
  const cfg = config();

  if (totalAmount < cfg.minimumOrderValue) {
    errors.push({
      field: 'total',
      code: 'BELOW_MINIMUM',
      message: `Order total £${totalAmount.toFixed(2)} is below the minimum order value of £${cfg.minimumOrderValue.toFixed(2)}`,
    });
  }

  return { valid: errors.length === 0, errors };
}
