async function testCreate() {
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

  // Create test order
  const order = [{
    Source: 'MANUAL',
    SubSource: 'TEST',
    ReferenceNumber: 'TEST-' + Date.now(),
    ExternalReference: 'TEST-' + Date.now(),
    ReceivedDate: new Date().toISOString(),
    DispatchBy: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    Currency: 'GBP',
    ChannelBuyerName: 'Test Buyer',
    DeliveryAddress: {
      FullName: 'Test Store',
      Address1: '123 Test Street',
      Town: 'London',
      PostCode: 'SW1A 1AA',
      Country: 'United Kingdom',
    },
    BillingAddress: {
      FullName: 'Test Store',
      Address1: '123 Test Street',
      Town: 'London',
      PostCode: 'SW1A 1AA',
      Country: 'United Kingdom',
    },
    OrderItems: [{
      ItemNumber: 'A00729.',
      ChannelSKU: 'A00729.',
      ItemTitle: 'Beef Bourguignon Burgundy 1842',
      Qty: 6,
      PricePerUnit: 3.90,
      TaxRate: 20,
      TaxCostInclusive: true,
      LinePercentDiscount: 0,
    }]
  }];

  console.log('Sending order:', JSON.stringify(order, null, 2));

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

  console.log('Response status:', orderRes.status);
  const result = await orderRes.text();
  console.log('Response body:', result);
}

testCreate().catch(console.error);
