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

  // Try searching by product name instead
  const searchTerms = ['Porcini', 'Beef Bourguignon', 'Cottage Pie', 'Mexican Beef', 'Butter Chicken'];

  for (const term of searchTerms) {
    const searchRes = await fetch(auth.Server + '/api/Inventory/GetInventoryItemsBySearch', {
      method: 'POST',
      headers: {
        'Authorization': auth.Token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        searchTerm: term,
        pageNumber: '1',
        entriesPerPage: '20',
      }).toString(),
    });

    const result = await searchRes.json();
    console.log(`\nSearch: "${term}" - Found ${result.Items?.length || 0} items`);
    if (result.Items && result.Items.length > 0) {
      result.Items.forEach(item => {
        console.log(`  SKU: ${item.SKU}, StockItemId: ${item.StockItemId}`);
        console.log(`  Title: ${item.Title}`);
      });
    }
  }

  // Also try getting all inventory
  console.log('\n\n--- Getting all inventory ---');
  const allRes = await fetch(auth.Server + '/api/Inventory/GetInventoryItemsBySearch', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      searchTerm: 'Case x 6',
      pageNumber: '1',
      entriesPerPage: '50',
    }).toString(),
  });

  const allResult = await allRes.json();
  console.log(`Found ${allResult.Items?.length || 0} items with "Case x 6"`);
  if (allResult.Items) {
    allResult.Items.forEach(item => {
      console.log(`SKU: ${item.SKU} | ${item.Title.substring(0, 60)}`);
    });
  }
}

getInventory().catch(console.error);
