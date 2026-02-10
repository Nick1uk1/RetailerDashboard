async function checkOrder() {
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

  if (!auth.Token) {
    console.log('Auth failed:', auth);
    return;
  }

  console.log('Auth successful, server:', auth.Server);

  // Search for recent orders
  const searchRes = await fetch(auth.Server + '/api/Orders/GetOpenOrders', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      entriesPerPage: '50',
      pageNumber: '1',
    }).toString(),
  });

  const orders = await searchRes.json();
  console.log('Open orders count:', orders.Data?.length || 0);

  if (orders.Data && orders.Data.length > 0) {
    orders.Data.slice(0, 5).forEach(o => {
      console.log(`- ${o.NumOrderId}: ${o.Source}/${o.SubSource} - ${o.ReferenceNum} - ${o.ReceivedDate}`);
    });
  }

  // Also try to get the specific order
  const orderId = 'd9f0bf15-cdac-418c-96cb-6c4a399e1cf9';
  const orderRes = await fetch(auth.Server + '/api/Orders/GetOrdersById', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      pkOrderIds: JSON.stringify([orderId]),
    }).toString(),
  });

  const specificOrder = await orderRes.json();
  console.log('\nSpecific order lookup:', JSON.stringify(specificOrder, null, 2));
}

checkOrder().catch(console.error);
