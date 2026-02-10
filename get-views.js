async function getViews() {
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

  // Get inventory views first
  const viewsRes = await fetch(auth.Server + '/api/Inventory/GetInventoryViews', {
    method: 'GET',
    headers: {
      'Authorization': auth.Token,
    },
  });

  console.log('Views Status:', viewsRes.status);
  const views = await viewsRes.json();
  console.log('Views:', JSON.stringify(views, null, 2));

  // Get categories
  console.log('\n--- Categories ---');
  const catRes = await fetch(auth.Server + '/api/Inventory/GetCategories', {
    method: 'GET',
    headers: {
      'Authorization': auth.Token,
    },
  });

  const cats = await catRes.json();
  cats.slice(0, 20).forEach(c => console.log(`  ${c.CategoryName}`));
}

getViews().catch(console.error);
