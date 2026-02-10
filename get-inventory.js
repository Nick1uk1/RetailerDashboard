async function getInventory() {
  // Authenticate
  const authParams = new URLSearchParams({
    applicationId: '51e2b5ee-bb88-4a20-b0d6-72b74f3e9642',
    applicationSecret: '5daa226d-bb00-43f9-b26c-dfb755323246',
    token: '1b385b6dee2b50f8717b0520d06f266e',
  });

  const authRes = await fetch('https://api.linnworks.net/api/Auth/AuthorizeByApplication', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: authParams.toString(),
  });

  const auth = await authRes.json();
  console.log('Server:', auth.Server);

  // Search for each SKU in inventory
  const skus = ['A00729.', 'A00731.', 'A00734.', 'A00735.', 'A00737.', 'A00738.', 'A00739.', 'A00740.', 'A00741.', 'A00742.', 'A00743.'];

  for (const sku of skus) {
    const searchRes = await fetch(auth.Server + '/api/Inventory/GetInventoryItemsBySearch', {
      method: 'POST',
      headers: {
        'Authorization': auth.Token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        searchTerm: sku,
        pageNumber: '1',
        entriesPerPage: '10',
      }).toString(),
    });

    const result = await searchRes.json();
    if (result.Items && result.Items.length > 0) {
      const item = result.Items[0];
      console.log(`${sku} => pkStockItemId: ${item.StockItemId}, Title: ${item.Title.substring(0, 50)}...`);
    } else {
      console.log(`${sku} => NOT FOUND`);
    }
  }
}

getInventory().catch(console.error);
