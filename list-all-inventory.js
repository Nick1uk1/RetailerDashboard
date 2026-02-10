async function listInventory() {
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

  // Try different API endpoint
  const viewRes = await fetch(auth.Server + '/api/Inventory/GetInventoryItems', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      view: {
        Filters: [],
        Page: 1,
        PageSize: 100,
      }
    }),
  });

  console.log('Status:', viewRes.status);
  const result = await viewRes.json();
  console.log('Response:', JSON.stringify(result).substring(0, 500));

  // Try another approach - GetStockItems
  console.log('\n--- Trying GetStockItems ---');
  const stockRes = await fetch(auth.Server + '/api/Stock/GetStockItems', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      locationId: '00000000-0000-0000-0000-000000000000',
      itemsPerPage: '100',
      pageNumber: '1',
    }).toString(),
  });

  console.log('Status:', stockRes.status);
  const stockResult = await stockRes.text();
  console.log('Response:', stockResult.substring(0, 1000));
}

listInventory().catch(console.error);
