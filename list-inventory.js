async function listInventory() {
  const authRes = await fetch('https://api.linnworks.net/api/Auth/AuthorizeByApplication', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      applicationId: '51e2b5ee-bb88-4a20-b0d6-72b74f3e9642',
      applicationSecret: '5daa226d-bb00-43f9-b26c-dfb755323246',
      token: '1b385b6dee2b50f8717b0520d06f266e',
    }).toString(),
  });
  const auth = await authRes.json();
  console.log('Server:', auth.Server);

  // Try GetAllItems endpoint
  console.log('\n--- Trying GetAllItems ---');
  const allRes = await fetch(auth.Server + '/api/Stock/GetAllStockItems', {
    method: 'GET',
    headers: { 'Authorization': auth.Token },
  });
  console.log('Status:', allRes.status);
  if (allRes.ok) {
    const items = await allRes.json();
    console.log('Items:', items?.length || 0);
    if (Array.isArray(items)) {
      items.slice(0, 10).forEach(i => console.log('  ', i.SKU || i.ItemNumber, i.Title || i.Name));
    }
  }

  // Try GetInventoryItems with empty view
  console.log('\n--- Trying GetInventoryItems ---');
  const invRes = await fetch(auth.Server + '/api/Inventory/GetInventoryItems', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      view: {
        Channels: [],
        Columns: [{ ColumnName: "SKU" }, { ColumnName: "Title" }, { ColumnName: "CategoryName" }],
        Filters: [],
        StockLocationIds: []
      },
      pageNumber: 1,
      entriesPerPage: 50,
    }),
  });
  console.log('Status:', invRes.status);
  const invText = await invRes.text();
  console.log('Response:', invText.substring(0, 500));

  // Try basic search with asterisk
  console.log('\n--- Search with * ---');
  const starRes = await fetch(auth.Server + '/api/Inventory/GetInventoryItemsBySearch', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      searchTerm: '*',
      pageNumber: '1',
      entriesPerPage: '50',
    }).toString(),
  });
  const starResult = await starRes.json();
  console.log('Found:', starResult.TotalItems || starResult.Items?.length || 0);
}

listInventory().catch(console.error);
