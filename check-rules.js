async function checkRules() {
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

  // Try to add a channel SKU mapping via API
  console.log('\n--- Trying to create channel SKU mapping ---');

  // First let's list existing sources/channels
  const sourcesRes = await fetch(auth.Server + '/api/Orders/GetChannels', {
    method: 'GET',
    headers: {
      'Authorization': auth.Token,
    },
  });

  if (sourcesRes.ok) {
    const sources = await sourcesRes.json();
    console.log('Channels:', sources);
  }

  // Try GetAvailableSources
  const availRes = await fetch(auth.Server + '/api/Orders/GetAvailableSources', {
    method: 'GET',
    headers: {
      'Authorization': auth.Token,
    },
  });

  if (availRes.ok) {
    const avail = await availRes.json();
    console.log('\nAvailable Sources:', avail.slice(0, 10));
  }
}

checkRules().catch(console.error);
