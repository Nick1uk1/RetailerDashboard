/**
 * Syncs Linnworks StockItemIds to local SKU records.
 * Run: node sync-stock-ids.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const prisma = new PrismaClient();

async function authenticate() {
  const appId = process.env.LINNWORKS_APP_ID;
  const appSecret = process.env.LINNWORKS_APP_SECRET;
  const installToken = process.env.LINNWORKS_INSTALL_TOKEN;

  if (!appId || !appSecret || !installToken) {
    throw new Error('Linnworks credentials not configured in .env');
  }

  const params = new URLSearchParams({
    applicationId: appId,
    applicationSecret: appSecret,
    token: installToken,
  });

  const response = await fetch('https://api.linnworks.net/api/Auth/AuthorizeByApplication', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const data = await response.json();
  return { token: data.Token, server: data.Server };
}

async function searchForItem(auth, skuCode) {
  // Method 1: Search by SKU
  const searchRes = await fetch(`${auth.server}/api/Inventory/GetInventoryItemsBySearch`, {
    method: 'POST',
    headers: {
      'Authorization': auth.token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      searchTerm: skuCode,
      pageNumber: '1',
      entriesPerPage: '20',
    }).toString(),
  });

  if (searchRes.ok) {
    const result = await searchRes.json();
    if (result.Items) {
      const exact = result.Items.find(i => i.SKU === skuCode);
      if (exact) {
        return { StockItemId: exact.StockItemId, method: 'search' };
      }
    }
  }

  // Method 2: GetStockItemIdsBySKU
  const stockRes = await fetch(`${auth.server}/api/Stock/GetStockItemIdsBySKU`, {
    method: 'POST',
    headers: {
      'Authorization': auth.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ request: { SKUs: [skuCode] } }),
  });

  if (stockRes.ok) {
    const result = await stockRes.json();
    if (result && result.length > 0 && result[0].StockItemId) {
      return { StockItemId: result[0].StockItemId, method: 'stock-api' };
    }
  }

  return null;
}

async function main() {
  console.log('Linnworks StockItemId Sync\n');

  const auth = await authenticate();
  console.log('Authenticated:', auth.server);

  // Get SKUs needing sync
  const skus = await prisma.sKU.findMany({
    where: { active: true },
  });

  console.log(`\nChecking ${skus.length} SKUs...\n`);

  let synced = 0;
  let alreadySynced = 0;
  let notFound = 0;

  for (const sku of skus) {
    if (sku.linnworksStockItemId) {
      console.log(`${sku.skuCode}: already has StockItemId`);
      alreadySynced++;
      continue;
    }

    const item = await searchForItem(auth, sku.skuCode);

    if (item) {
      await prisma.sKU.update({
        where: { id: sku.id },
        data: { linnworksStockItemId: item.StockItemId },
      });
      console.log(`${sku.skuCode}: ✓ synced (${item.method}) -> ${item.StockItemId}`);
      synced++;
    } else {
      console.log(`${sku.skuCode}: ✗ not found in Linnworks`);
      notFound++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Already synced: ${alreadySynced}`);
  console.log(`Newly synced: ${synced}`);
  console.log(`Not found: ${notFound}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
