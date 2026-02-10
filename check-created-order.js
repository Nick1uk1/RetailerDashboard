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

async function main() {
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

  // Get the most recent order
  const ordersRes = await fetch(`${auth.Server}/api/Orders/GetOpenOrders`, {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      pageNumber: '1',
      entriesPerPage: '5',
    }).toString(),
  });

  const orders = await ordersRes.json();
  console.log('Recent orders:');

  if (orders.Data && orders.Data.length > 0) {
    const latestOrder = orders.Data[0];
    console.log('\nLatest order:', latestOrder.NumOrderId);
    console.log('Reference:', latestOrder.ReferenceNum);
    console.log('Items:', latestOrder.Items?.length);

    if (latestOrder.Items) {
      console.log('\nOrder Items:');
      latestOrder.Items.forEach(item => {
        console.log(`  SKU: "${item.SKU}"`);
        console.log(`    ItemNumber: "${item.ItemNumber}"`);
        console.log(`    ChannelSKU: "${item.ChannelSKU}"`);
        console.log(`    Title: ${item.ItemTitle?.substring(0, 40)}`);
        console.log(`    StockItemId: ${item.StockItemId}`);
        console.log(`    Linked: ${item.StockItemId !== '00000000-0000-0000-0000-000000000000' ? '✓ YES' : '✗ NO'}`);
        console.log('');
      });
    }

    // Get full order details
    console.log('\n--- Full Order Details ---');
    const fullRes = await fetch(`${auth.Server}/api/Orders/GetOrder`, {
      method: 'POST',
      headers: {
        'Authorization': auth.Token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        orderId: latestOrder.pkOrderID,
      }).toString(),
    });

    if (fullRes.ok) {
      const full = await fullRes.json();
      console.log('Order status:', full.GeneralInfo?.Status);
      if (full.Items) {
        console.log('\nItems from GetOrder:');
        full.Items.forEach(item => {
          console.log(`  ${item.SKU || item.ItemNumber} -> StockItemId: ${item.fkStockItemId_Alias || item.StockItemId || 'null'}`);
        });
      }
    }
  }
}

main().catch(console.error);
