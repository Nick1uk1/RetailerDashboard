async function getRetailCase() {
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

  // Get all categories to find the ID
  const catRes = await fetch(auth.Server + '/api/Inventory/GetCategories', {
    method: 'GET',
    headers: {
      'Authorization': auth.Token,
    },
  });

  const cats = await catRes.json();
  const retailCase = cats.find(c => c.CategoryName === 'Retail (CASE)');
  console.log('Retail (CASE) category:', retailCase);

  if (retailCase) {
    // Search with category filter
    const searchRes = await fetch(auth.Server + '/api/Inventory/GetInventoryItemsBySearch', {
      method: 'POST',
      headers: {
        'Authorization': auth.Token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        searchTerm: '',
        pageNumber: '1',
        entriesPerPage: '100',
        categoryId: retailCase.CategoryId,
      }).toString(),
    });

    const result = await searchRes.json();
    console.log(`\nFound ${result.Items?.length || 0} items in Retail (CASE)`);

    if (result.Items && result.Items.length > 0) {
      console.log('\n--- Retail (CASE) Products ---');
      result.Items.forEach(item => {
        console.log(`SKU: ${item.SKU} | StockItemId: ${item.StockItemId}`);
        console.log(`  Title: ${item.Title}`);
      });
    }
  }

  // Also try getting view by keyword
  console.log('\n--- Searching all with keyword "A007" ---');
  const searchRes2 = await fetch(auth.Server + '/api/Inventory/GetInventoryItemsBySearch', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      searchTerm: 'A007',
      pageNumber: '1',
      entriesPerPage: '50',
    }).toString(),
  });

  const result2 = await searchRes2.json();
  console.log(`Found: ${result2.Items?.length || 0}`);
  if (result2.Items) {
    result2.Items.forEach(item => {
      console.log(`  ${item.SKU}: ${item.Title}`);
    });
  }
}

getRetailCase().catch(console.error);
