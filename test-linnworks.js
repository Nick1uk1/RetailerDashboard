async function test() {
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
  console.log('Auth response:', JSON.stringify(auth, null, 2));

  if (!auth.Token) {
    console.log('Auth failed');
    return;
  }

  // Create test order
  const order = [{
    Source: 'RetailPortal',
    SubSource: 'TEST',
    ReferenceNumber: 'TEST-' + Date.now(),
    ExternalReference: 'TEST-' + Date.now(),
    ReceivedDate: new Date().toISOString(),
    DispatchBy: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    Currency: 'GBP',
    ChannelBuyerName: 'Test Buyer',
    OrderItems: [{
      ItemNumber: 'HC-BEEF-001',
      ChannelSKU: 'HC-BEEF-001',
      ItemTitle: 'Test Item',
      Qty: 6,
      PricePerUnit: 3.90,
      TaxRate: 20,
      TaxCostInclusive: true,
      LinePercentDiscount: 0,
    }]
  }];

  const orderParams = new URLSearchParams({
    orders: JSON.stringify(order),
  });

  const orderRes = await fetch(auth.Server + '/api/Orders/CreateOrders', {
    method: 'POST',
    headers: {
      'Authorization': auth.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: orderParams.toString(),
  });

  const orderResult = await orderRes.text();
  console.log('Order response status:', orderRes.status);
  console.log('Order response:', orderResult);
}

test().catch(console.error);
