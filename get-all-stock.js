async function getAllStock() {
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

  // Get locations first
  const locRes = await fetch(auth.Server + '/api/Inventory/GetStockLocations', {
    method: 'GET',
    headers: {
      'Authorization': auth.Token,
    },
  });

  const locations = await locRes.json();
  console.log('Locations:', locations);

  // Try getting inventory view with all items
  console.log('\n--- GetInventoryItemsFromView ---');
  const viewRes = await fetch(auth.Server + '/api/Inventory/GetInventoryItemsFromView', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      viewName: '',
      stockLocationId: locations[0]?.StockLocationId || '00000000-0000-0000-0000-000000000000',
      pageNumber: '1',
      entriesPerPage: '50',
    }).toString(),
  });

  console.log('Status:', viewRes.status);
  const viewResult = await viewRes.json();
  console.log('Found items:', viewResult.TotalItems);
  if (viewResult.Items) {
    console.log('Sample:', viewResult.Items.slice(0, 5).map(i => `${i.SKU}: ${i.Title}`));
  }
}

getAllStock().catch(console.error);
