async function searchSKU() {
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

  // Try GetInventoryItemBySKU
  console.log('\n--- GetInventoryItemBySKU ---');
  const skuRes = await fetch(auth.Server + '/api/Inventory/GetInventoryItemBySKU', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      SKU: 'A00735.',
    }).toString(),
  });

  console.log('Status:', skuRes.status);
  const skuResult = await skuRes.json();
  console.log('Result:', JSON.stringify(skuResult, null, 2));

  // Try without period
  console.log('\n--- GetInventoryItemBySKU (no period) ---');
  const skuRes2 = await fetch(auth.Server + '/api/Inventory/GetInventoryItemBySKU', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      SKU: 'A00735',
    }).toString(),
  });

  console.log('Status:', skuRes2.status);
  const skuResult2 = await skuRes2.json();
  console.log('Result:', JSON.stringify(skuResult2, null, 2));
}

searchSKU().catch(console.error);
