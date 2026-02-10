const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOrder() {
  // Get a retailer
  const retailer = await prisma.retailer.findFirst({ where: { active: true } });
  if (!retailer) {
    console.log('No active retailer found');
    return;
  }
  console.log('Retailer:', retailer.name, '(', retailer.id, ')');

  // Get SKUs
  const skus = await prisma.sKU.findMany({ where: { active: true }, take: 2 });
  console.log('\nSKUs to order:');
  skus.forEach(s => console.log(`  ${s.skuCode}: ${s.name}`));

  // Build test payload (simulating what would be sent)
  console.log('\n--- Simulated Linnworks Payload ---');
  const orderItems = skus.map(sku => ({
    ItemNumber: sku.skuCode,
    SKU: sku.skuCode,
    ChannelSKU: sku.skuCode,
    ItemTitle: sku.name,
    Qty: 1,
    PricePerUnit: Number(sku.basePrice),
  }));

  console.log('OrderItems:');
  orderItems.forEach(item => {
    console.log(`  SKU: "${item.SKU}" (has period: ${item.SKU.endsWith('.')})`);
  });

  // Create actual order via API
  console.log('\n--- Creating Order via API ---');
  const orderInput = {
    retailerId: retailer.id,
    lines: skus.map(s => ({ skuCode: s.skuCode, qty: 6 })),
    poNumber: 'TEST-' + Date.now(),
    notes: 'Test order for SKU mapping verification',
  };

  try {
    const response = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=test', // Will fail auth but shows payload
      },
      body: JSON.stringify(orderInput),
    });

    const result = await response.json();
    console.log('Response:', response.status, JSON.stringify(result, null, 2));
  } catch (err) {
    console.log('API call failed (expected if not logged in):', err.message);
  }

  // Check what SKU codes would be stored
  console.log('\n--- Verification ---');
  console.log('Database SKU codes (what will be sent to Linnworks):');
  const allSkus = await prisma.sKU.findMany({ select: { skuCode: true } });
  allSkus.forEach(s => {
    const hasPeriod = s.skuCode.endsWith('.');
    console.log(`  ${s.skuCode} - ${hasPeriod ? '✓ has period (CASE)' : '✗ NO period'}`);
  });
}

testOrder()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
