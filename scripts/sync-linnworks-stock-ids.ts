/**
 * Syncs Linnworks StockItemIds to local SKU records.
 * This ensures orders link to the correct inventory items in Linnworks.
 *
 * Usage: npx ts-node scripts/sync-linnworks-stock-ids.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface LinnworksInventoryItem {
  StockItemId: string;
  SKU: string;
  Title: string;
  CategoryName?: string;
}

async function authenticate(): Promise<{ token: string; server: string }> {
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

async function getRetailCaseCategoryId(auth: { token: string; server: string }): Promise<string | null> {
  const response = await fetch(`${auth.server}/api/Inventory/GetCategories`, {
    headers: { 'Authorization': auth.token },
  });

  if (!response.ok) {
    console.error('Failed to get categories');
    return null;
  }

  const categories = await response.json();
  const retailCase = categories.find((c: { CategoryName: string }) => c.CategoryName === 'Retail (CASE)');
  return retailCase?.CategoryId || null;
}

async function searchInventoryItems(
  auth: { token: string; server: string },
  skuCode: string
): Promise<LinnworksInventoryItem | null> {
  // Try exact SKU search
  const response = await fetch(`${auth.server}/api/Inventory/GetInventoryItemsBySearch`, {
    method: 'POST',
    headers: {
      'Authorization': auth.token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      searchTerm: skuCode,
      pageNumber: '1',
      entriesPerPage: '10',
    }).toString(),
  });

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  if (result.Items && result.Items.length > 0) {
    // Find exact match
    const exactMatch = result.Items.find((item: LinnworksInventoryItem) => item.SKU === skuCode);
    if (exactMatch) {
      return exactMatch;
    }
  }

  return null;
}

async function getInventoryItemBySKU(
  auth: { token: string; server: string },
  skuCode: string
): Promise<LinnworksInventoryItem | null> {
  // Try the GetStockItemIdsBySKU endpoint
  const response = await fetch(`${auth.server}/api/Stock/GetStockItemIdsBySKU`, {
    method: 'POST',
    headers: {
      'Authorization': auth.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ request: { SKUs: [skuCode] } }),
  });

  if (response.ok) {
    const result = await response.json();
    if (result && result.length > 0 && result[0].StockItemId) {
      return {
        StockItemId: result[0].StockItemId,
        SKU: skuCode,
        Title: '',
      };
    }
  }

  return null;
}

async function syncStockItemIds(): Promise<void> {
  console.log('Starting Linnworks StockItemId sync...\n');

  // Load environment
  require('dotenv').config();

  const auth = await authenticate();
  console.log('Authenticated with Linnworks:', auth.server);

  // Get Retail (CASE) category ID for reference
  const categoryId = await getRetailCaseCategoryId(auth);
  console.log('Retail (CASE) category ID:', categoryId || 'not found');

  // Get all SKUs from portal that need syncing
  const skus = await prisma.sKU.findMany({
    where: {
      active: true,
      linnworksStockItemId: null, // Only sync those without StockItemId
    },
  });

  console.log(`\nFound ${skus.length} SKUs to sync\n`);

  let synced = 0;
  let failed = 0;

  for (const sku of skus) {
    process.stdout.write(`Syncing ${sku.skuCode}... `);

    // Try different methods to find the StockItemId
    let item = await searchInventoryItems(auth, sku.skuCode);

    if (!item) {
      item = await getInventoryItemBySKU(auth, sku.skuCode);
    }

    if (item && item.StockItemId) {
      await prisma.sKU.update({
        where: { id: sku.id },
        data: { linnworksStockItemId: item.StockItemId },
      });
      console.log(`✓ ${item.StockItemId}`);
      synced++;
    } else {
      console.log('✗ not found in Linnworks');
      failed++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Synced: ${synced}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${skus.length}`);
}

// Run the sync
syncStockItemIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
