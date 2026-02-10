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

// SKUs from the Linnworks export
const skusToFind = [
  'A00735.',
  'A00731.',
  'A00729.',
  'A00738.',
  'A00737.',
  'A00734.',
  'A00740.',
  'A00741.',
  'A00743.',
  'A00739.',
  'A00742.',
];

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

  // Method 1: GetStockItemIdsBySKU (batch)
  console.log('\n--- GetStockItemIdsBySKU (batch) ---');
  const batchRes = await fetch(`${auth.Server}/api/Stock/GetStockItemIdsBySKU`, {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ request: { SKUs: skusToFind } }),
  });
  console.log('Status:', batchRes.status);
  if (batchRes.ok) {
    const result = await batchRes.json();
    console.log('Result:', JSON.stringify(result, null, 2));
  } else {
    console.log('Error:', await batchRes.text());
  }

  // Method 2: GetStockItemByKey for each SKU
  console.log('\n--- GetStockItemByKey ---');
  for (const sku of skusToFind.slice(0, 3)) {
    const res = await fetch(`${auth.Server}/api/Stock/GetStockItemByKey`, {
      method: 'POST',
      headers: {
        'Authorization': auth.Token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        keyValue: sku,
        keyType: 'SKU',
      }).toString(),
    });
    console.log(`${sku}: Status ${res.status}`);
    if (res.ok) {
      const item = await res.json();
      console.log(`  StockItemId: ${item.StockItemId || item.pkStockItemId}`);
    }
  }

  // Method 3: GetInventoryItemById - need the ID first
  // Method 4: Try SQL-like query
  console.log('\n--- ExecuteCustomScriptQuery ---');
  const sqlRes = await fetch(`${auth.Server}/api/Dashboards/ExecuteCustomScriptQuery`, {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: "SELECT pkStockItemID, ItemNumber FROM StockItem WHERE ItemNumber LIKE 'A007%'",
    }),
  });
  console.log('Status:', sqlRes.status);
  if (sqlRes.ok) {
    const result = await sqlRes.json();
    console.log('Result:', JSON.stringify(result, null, 2));
  } else {
    console.log('Error:', await sqlRes.text());
  }
}

main().catch(console.error);
