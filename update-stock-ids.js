const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping from Linnworks query - items WITH period (Retail CASE)
const stockItemMapping = {
  'A00729.': '3617d302-cbfb-4e14-a995-aa54d182da4b',
  'A00731.': 'b38c90d8-2aa9-4df2-af14-e44378ed9c3c',
  'A00734.': '43ce4efa-5693-4bb4-a1de-1620c1c92ec0',
  'A00735.': '4c670c5c-14e9-4bb3-8257-0623b3e29c82',
  'A00737.': '3e13ca7c-54e3-42d9-b152-e9a997fcfc31',
  'A00738.': 'a521a348-d866-4ecc-b59f-1048e9dbb990',
  'A00739.': 'e007069b-6aa9-4a0d-a11c-de4503417416',
  'A00740.': 'dc8007e9-60f1-49e6-a548-5219f54c2878',
  'A00741.': 'a6b5ee8e-6d3f-44f1-94da-d1896d72486c',
  'A00742.': 'c57a992e-8b02-45e9-ab57-51ae61baab60',
  'A00743.': 'e2e8c4bb-dfa8-4703-9166-59cd29fab44c',
};

async function main() {
  console.log('Updating SKUs with Linnworks StockItemIds (Retail CASE items)...\n');

  for (const [skuCode, stockItemId] of Object.entries(stockItemMapping)) {
    const result = await prisma.sKU.updateMany({
      where: { skuCode },
      data: { linnworksStockItemId: stockItemId },
    });

    if (result.count > 0) {
      console.log(`✓ ${skuCode} -> ${stockItemId}`);
    } else {
      console.log(`- ${skuCode} not found in portal`);
    }
  }

  // Verify
  console.log('\n--- Verification ---');
  const skus = await prisma.sKU.findMany({
    select: { skuCode: true, linnworksStockItemId: true },
    orderBy: { skuCode: 'asc' },
  });

  skus.forEach(sku => {
    const status = sku.linnworksStockItemId ? '✓' : '✗';
    console.log(`${status} ${sku.skuCode}: ${sku.linnworksStockItemId || 'not set'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
