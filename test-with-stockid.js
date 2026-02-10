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

async function main() {
  const retailer = await prisma.retailer.findFirst({ where: { active: true } });
  const skus = await prisma.sKU.findMany({ where: { active: true }, take: 2 });

  console.log('Testing with StockItemIds (BinRack)...\n');
  console.log('SKUs:');
  skus.forEach(s => {
    console.log(`  ${s.skuCode} -> StockItemId: ${s.linnworksStockItemId}`);
  });

  // Build payload with StockItemId
  const orderItems = skus.map(sku => ({
    ItemNumber: sku.skuCode,
    SKU: sku.skuCode,
    ChannelSKU: sku.skuCode,
    ItemTitle: sku.name,
    Qty: 6,
    PricePerUnit: Number(sku.basePrice),
    TaxRate: 20,
    TaxCostInclusive: true,
    LinePercentDiscount: 0,
    BinRack: sku.linnworksStockItemId, // Direct link to inventory
  }));

  const payload = {
    Source: 'MANUAL',
    SubSource: retailer.code,
    ReferenceNumber: 'TEST-STOCKID-' + Date.now(),
    ExternalReference: 'TEST-STOCKID-' + Date.now(),
    ReceivedDate: new Date().toISOString(),
    DispatchBy: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    Currency: 'GBP',
    ChannelBuyerName: retailer.name,
    OrderItems: orderItems,
    PaymentStatus: 'UNPAID',
    PaidAmount: 0,
    DeliveryAddress: {
      FullName: retailer.name,
      Company: retailer.name,
      Address1: retailer.addressLine1 || 'Test Address',
      Town: retailer.city || 'London',
      PostCode: retailer.postcode || 'SW1A 1AA',
      Country: 'United Kingdom',
      EmailAddress: retailer.contactEmail,
    },
    BillingAddress: {
      FullName: retailer.name,
      Company: retailer.name,
      Address1: retailer.addressLine1 || 'Test Address',
      Town: retailer.city || 'London',
      PostCode: retailer.postcode || 'SW1A 1AA',
      Country: 'United Kingdom',
      EmailAddress: retailer.contactEmail,
    },
  };

  console.log('\nPayload OrderItems:');
  payload.OrderItems.forEach(i => {
    console.log(`  SKU: ${i.SKU}, BinRack: ${i.BinRack}`);
  });

  // Authenticate
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

  // Create order
  console.log('\nCreating order in Linnworks...');
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

  const result = await createRes.json();
  console.log('Result:', result);

  if (result && result[0]) {
    const pkOrderId = result[0];
    console.log('\n✓ Order created:', pkOrderId);

    // Wait a moment then check the order
    await new Promise(r => setTimeout(r, 1000));

    // Get order details
    const ordersRes = await fetch(`${auth.Server}/api/Orders/GetOpenOrders`, {
      method: 'POST',
      headers: {
        'Authorization': auth.Token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        pageNumber: '1',
        entriesPerPage: '3',
      }).toString(),
    });

    const orders = await ordersRes.json();
    const order = orders.Data?.find(o => o.pkOrderID === pkOrderId);

    if (order && order.Items) {
      console.log('\n=== ORDER ITEMS ===');
      order.Items.forEach(item => {
        const linked = item.StockItemId !== '00000000-0000-0000-0000-000000000000';
        console.log(`  SKU: "${item.SKU || item.ItemNumber}"`);
        console.log(`    StockItemId: ${item.StockItemId}`);
        console.log(`    Linked to inventory: ${linked ? '✓ YES' : '✗ NO'}`);
        console.log('');
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
