async function check() {
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

  // Get categories
  const catRes = await fetch(auth.Server + '/api/Inventory/GetCategories', {
    headers: { 'Authorization': auth.Token },
  });
  const cats = await catRes.json();

  // Check both Retail and Retail (CASE)
  const retail = cats.find(c => c.CategoryName === 'Retail');
  const retailCase = cats.find(c => c.CategoryName === 'Retail (CASE)');

  console.log('Retail:', retail);
  console.log('Retail (CASE):', retailCase);

  // Search for A00729. in each category
  for (const cat of [retail, retailCase]) {
    if (!cat) continue;
    console.log('\nSearching in', cat.CategoryName, '(ID:', cat.CategoryId + ')');
    const res = await fetch(auth.Server + '/api/Inventory/GetInventoryItemsBySearch', {
      method: 'POST',
      headers: {
        'Authorization': auth.Token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        searchTerm: 'A00729',
        pageNumber: '1',
        entriesPerPage: '20',
        categoryId: cat.CategoryId,
      }).toString(),
    });
    const result = await res.json();
    console.log('Found:', result.Items?.length || 0);
    if (result.Items) {
      result.Items.forEach(i => console.log('  SKU:', i.SKU, '| StockItemId:', i.StockItemId, '| Title:', i.Title?.substring(0, 40)));
    }
  }

  // Also search without category filter
  console.log('\n--- All items matching A00729 (no category filter) ---');
  const allRes = await fetch(auth.Server + '/api/Inventory/GetInventoryItemsBySearch', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      searchTerm: 'A00729',
      pageNumber: '1',
      entriesPerPage: '20',
    }).toString(),
  });
  const allResult = await allRes.json();
  console.log('Found:', allResult.Items?.length || 0);
  if (allResult.Items) {
    allResult.Items.forEach(i => console.log('  SKU:', i.SKU, '| StockItemId:', i.StockItemId, '| Category:', i.CategoryName));
  }
}

check().catch(console.error);
