/**
 * Direct test of order creation and Linnworks payload
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const prisma = new PrismaClient();

// Simplified payload builder (same logic as the app)
function buildPayload(order) {
  const taxCostInclusive = process.env.TAX_MODE === 'INCLUSIVE';
  const taxRate = taxCostInclusive ? 20 : 0;

  const orderItems = order.lines.map((line) => ({
    ItemNumber: line.skuCode,
    SKU: line.skuCode,
    ChannelSKU: line.skuCode,
    ItemTitle: line.skuName,
    Qty: line.qty,
    PricePerUnit: Number(line.unitPrice),
    TaxRate: taxRate,
    TaxCostInclusive: taxCostInclusive,
    LinePercentDiscount: 0,
  }));

  return {
    Source: 'MANUAL',
    SubSource: order.retailer.code,
    ReferenceNumber: order.externalRef,
    ExternalReference: order.externalRef,
    Currency: 'GBP',
    ChannelBuyerName: order.retailer.name,
    OrderItems: orderItems,
  };
}

async function main() {
  // Get retailer
  const retailer = await prisma.retailer.findFirst({ where: { active: true } });
  console.log('Retailer:', retailer.name);

  // Get 2 SKUs
  const skus = await prisma.sKU.findMany({ where: { active: true }, take: 2 });
  console.log('\nSKUs:');
  skus.forEach(s => console.log(`  ${s.skuCode}`));

  // Create order lines (simulating what createOrder does)
  // KEY CHANGE: Using sku.skuCode (from database) instead of input
  const orderLines = skus.map(sku => ({
    skuId: sku.id,
    skuCode: sku.skuCode,  // This is the fix - uses database skuCode
    skuName: sku.name,
    qty: 6,
    unitPrice: sku.basePrice,
    lineTotal: Number(sku.basePrice) * 6,
  }));

  // Mock order object
  const mockOrder = {
    id: 'test-order-123',
    externalRef: 'TEST-' + Date.now(),
    lines: orderLines,
    retailer: retailer,
  };

  // Build Linnworks payload
  const payload = buildPayload(mockOrder);

  console.log('\n=== LINNWORKS PAYLOAD ===');
  console.log('OrderItems:');
  payload.OrderItems.forEach(item => {
    console.log(`  SKU: "${item.SKU}"`);
    console.log(`    - Has period (CASE): ${item.SKU.endsWith('.')}`);
    console.log(`    - ItemTitle: ${item.ItemTitle.substring(0, 50)}`);
  });

  // Actually send to Linnworks
  console.log('\n=== SENDING TO LINNWORKS ===');

  const authRes = await fetch('https://api.linnworks.net/api/Auth/AuthorizeByApplication', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      applicationId: process.env.LINNWORKS_APP_ID,
      applicationSecret: process.env.LINNWORKS_APP_SECRET,
      token: process.env.LINNWORKS_INSTALL_TOKEN,
    }).toString(),
  });
  const auth = await authRes.json();
  console.log('Authenticated:', auth.Server);

  // Add required fields
  payload.ReceivedDate = new Date().toISOString();
  payload.DispatchBy = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  payload.PaymentStatus = 'UNPAID';
  payload.PaidAmount = 0;
  payload.DeliveryAddress = {
    FullName: retailer.name,
    Company: retailer.name,
    Address1: retailer.addressLine1 || 'Test Address',
    Town: retailer.city || 'London',
    PostCode: retailer.postcode || 'SW1A 1AA',
    Country: 'United Kingdom',
    EmailAddress: retailer.contactEmail,
  };
  payload.BillingAddress = payload.DeliveryAddress;

  console.log('\nSending order to Linnworks...');
  console.log('Payload SKUs:', payload.OrderItems.map(i => i.SKU));

  const createRes = await fetch(`${auth.Server}/api/Orders/CreateOrders`, {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      orders: JSON.stringify([payload]),
    }).toString(),
  });

  console.log('Response status:', createRes.status);
  const result = await createRes.json();
  console.log('Result:', JSON.stringify(result, null, 2));

  if (result && result[0]) {
    console.log('\n✓ Order created in Linnworks!');
    console.log('  pkOrderId:', result[0]);

    // Verify the order items are linked correctly
    console.log('\nVerifying order items...');
    const orderRes = await fetch(`${auth.Server}/api/Orders/GetOrderById`, {
      method: 'POST',
      headers: {
        'Authorization': auth.Token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        pkOrderId: result[0],
      }).toString(),
    });

    if (orderRes.ok) {
      const orderDetail = await orderRes.json();
      console.log('\nOrder items in Linnworks:');
      if (orderDetail.Items) {
        orderDetail.Items.forEach(item => {
          const linked = item.StockItemId !== '00000000-0000-0000-0000-000000000000';
          console.log(`  SKU: "${item.SKU}" | Linked: ${linked ? '✓' : '✗'} | StockItemId: ${item.StockItemId}`);
        });
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
