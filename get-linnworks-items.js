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
  console.log('Server:', auth.Server);

  // Get stock locations
  const locRes = await fetch(`${auth.Server}/api/Inventory/GetStockLocations`, {
    headers: { 'Authorization': auth.Token },
  });
  const locations = await locRes.json();
  console.log('Location:', locations[0]?.LocationName);
  const locationId = locations[0]?.StockLocationId;

  // Try GetStockItemsFull
  console.log('\n--- GetStockItemsFull ---');
  const fullRes = await fetch(`${auth.Server}/api/Stock/GetStockItemsFull`, {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      keyword: '',
      loadCompositeParents: 'false',
      loadVariationParents: 'false',
      entriesPerPage: '50',
      pageNumber: '1',
    }).toString(),
  });
  console.log('Status:', fullRes.status);
  if (fullRes.ok) {
    const result = await fullRes.json();
    console.log('Total:', result.TotalItems);
    if (result.Items) {
      console.log('\nAll items:');
      result.Items.forEach(i => {
        console.log(`  SKU: "${i.SKU}" | ID: ${i.StockItemId} | Title: ${i.Title?.substring(0, 40)}`);
      });
    }
  } else {
    const text = await fullRes.text();
    console.log('Error:', text.substring(0, 200));
  }

  // Try GetInventoryItemsFromView with default view
  console.log('\n--- GetInventoryItemsFromView ---');
  const viewRes = await fetch(`${auth.Server}/api/Inventory/GetInventoryItemsFromView`, {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      viewName: 'Default',
      stockLocationId: locationId || '00000000-0000-0000-0000-000000000000',
      pageNumber: '1',
      entriesPerPage: '50',
    }).toString(),
  });
  console.log('Status:', viewRes.status);
  if (viewRes.ok) {
    const result = await viewRes.json();
    console.log('Total:', result.TotalItems);
    if (result.Items) {
      result.Items.slice(0, 10).forEach(i => {
        console.log(`  SKU: "${i.SKU}" | ID: ${i.StockItemId}`);
      });
    }
  } else {
    console.log('Error:', (await viewRes.text()).substring(0, 200));
  }
}

main().catch(console.error);
