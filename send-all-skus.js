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
  const skus = await prisma.sKU.findMany({ where: { active: true } });

  console.log('Sending order with 1 of each SKU...\n');
  console.log(`Retailer: ${retailer.name}`);
  console.log(`SKUs: ${skus.length}\n`);

  // Build order items - 1 of each
  const orderItems = skus.map(sku => ({
    ItemNumber: sku.skuCode,
    SKU: sku.skuCode,
    ChannelSKU: sku.skuCode,
    ItemTitle: sku.name,
    Qty: 1,
    PricePerUnit: Number(sku.basePrice),
    TaxRate: 20,
    TaxCostInclusive: true,
    LinePercentDiscount: 0,
    BinRack: sku.linnworksStockItemId,
  }));

  console.log('Order items:');
  orderItems.forEach(i => console.log(`  ${i.SKU} (qty: ${i.Qty})`));

  const payload = {
    Source: 'MANUAL',
    SubSource: retailer.code,
    ReferenceNumber: 'ALL-SKUS-' + Date.now(),
    ExternalReference: 'ALL-SKUS-' + Date.now(),
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
  console.log('\nAuthenticated:', auth.Server);

  // Create order
  console.log('\nSending order...');
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

  if (result && result[0]) {
    console.log('\n✓ Order created!');
    console.log('  pkOrderId:', result[0]);
  } else {
    console.log('Result:', result);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
