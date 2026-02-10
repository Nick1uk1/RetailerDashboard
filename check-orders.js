async function checkOrders() {
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

  // Get recent orders
  console.log('\n--- Recent Orders ---');
  const ordersRes = await fetch(auth.Server + '/api/Orders/GetOpenOrders', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      pageNumber: '1',
      entriesPerPage: '10',
    }).toString(),
  });

  console.log('Status:', ordersRes.status);
  if (ordersRes.ok) {
    const orders = await ordersRes.json();
    console.log('Orders found:', orders.TotalOrders || orders.Data?.length || 0);
    if (orders.Data) {
      orders.Data.slice(0, 3).forEach(o => {
        console.log('\nOrder:', o.NumOrderId, '| Ref:', o.ReferenceNum);
        console.log('  Items:', o.Items?.length || 0);
        if (o.Items) {
          o.Items.forEach(i => {
            console.log('    SKU:', i.SKU, '| StockItemId:', i.StockItemId, '| Title:', i.ItemTitle?.substring(0, 30));
          });
        }
      });
    }
  } else {
    console.log('Response:', await ordersRes.text());
  }

  // Get order by ID if we have one from the portal
  console.log('\n--- Checking LinnworksOrderMap ---');
}

checkOrders().catch(console.error);
