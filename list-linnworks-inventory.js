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
  console.log('Server:', auth.Server);

  // Get Retail (CASE) category
  const catRes = await fetch(`${auth.Server}/api/Inventory/GetCategories`, {
    headers: { 'Authorization': auth.Token },
  });
  const cats = await catRes.json();
  const retailCase = cats.find(c => c.CategoryName === 'Retail (CASE)');
  console.log('Retail (CASE):', retailCase);

  // Try ExecuteCustomScriptQuery to get items
  console.log('\n--- Trying ExecuteCustomScriptQuery ---');
  const queryRes = await fetch(`${auth.Server}/api/Dashboards/ExecuteCustomScriptQuery`, {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: "SELECT TOP 20 pkStockItemID, ItemNumber, ItemTitle, CategoryName FROM StockItem WHERE bLogicalDelete = 0",
    }),
  });
  console.log('Query status:', queryRes.status);
  if (queryRes.ok) {
    const result = await queryRes.json();
    console.log('Query result:', JSON.stringify(result, null, 2).substring(0, 1000));
  } else {
    console.log('Query error:', await queryRes.text());
  }

  // Try SearchInventory endpoint
  console.log('\n--- Trying SearchInventory ---');
  const searchRes = await fetch(`${auth.Server}/api/Inventory/SearchInventory`, {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      searchType: 'SKU',
      searchText: 'A007',
    }).toString(),
  });
  console.log('Search status:', searchRes.status);
  if (searchRes.ok) {
    const result = await searchRes.json();
    console.log('Found:', result.length || 0);
    if (Array.isArray(result)) {
      result.slice(0, 5).forEach(i => console.log('  ', i.SKU || i.ItemNumber, i.StockItemId));
    }
  }

  // Try GetInventoryItemsByIds if we have some IDs
  console.log('\n--- Trying different search term ---');
  const search2 = await fetch(`${auth.Server}/api/Inventory/GetInventoryItemsBySearch`, {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      searchTerm: 'Case',  // Search by common term
      pageNumber: '1',
      entriesPerPage: '20',
    }).toString(),
  });
  const search2Result = await search2.json();
  console.log('Found:', search2Result.Items?.length || 0, 'items');
  if (search2Result.Items) {
    search2Result.Items.slice(0, 10).forEach(i => {
      console.log(`  SKU: "${i.SKU}" | StockItemId: ${i.StockItemId}`);
    });
  }
}

main().catch(console.error);
