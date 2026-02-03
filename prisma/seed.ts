import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create retailer
  const retailer = await prisma.retailer.upsert({
    where: { code: 'DEMO001' },
    update: {},
    create: {
      name: 'Demo Retailer',
      code: 'DEMO001',
      contactEmail: 'contact@retailer.example.com',
      active: true,
    },
  });
  console.log('Created retailer:', retailer.name);

  // Create retailer user
  const user = await prisma.retailerUser.upsert({
    where: { email: 'buyer@retailer.example.com' },
    update: {},
    create: {
      retailerId: retailer.id,
      email: 'buyer@retailer.example.com',
      name: 'Demo Buyer',
      role: 'BUYER',
      active: true,
    },
  });
  console.log('Created user:', user.email);

  // Create SKUs
  const skuData = [
    { skuCode: 'BENTO-001', name: 'Bento Box Classic', basePrice: 12.99, packSize: 6 },
    { skuCode: 'BENTO-002', name: 'Bento Box Premium', basePrice: 18.99, packSize: 6 },
    { skuCode: 'BENTO-003', name: 'Bento Box Kids', basePrice: 8.99, packSize: 12 },
    { skuCode: 'SUSHI-001', name: 'Sushi Platter 12pc', basePrice: 15.99, packSize: 6 },
    { skuCode: 'SUSHI-002', name: 'Sushi Platter 24pc', basePrice: 28.99, packSize: 6 },
    { skuCode: 'RICE-001', name: 'Steamed Rice Bowl', basePrice: 4.99, packSize: 24 },
    { skuCode: 'NOODLE-001', name: 'Ramen Noodle Pack', basePrice: 6.99, packSize: 12 },
    { skuCode: 'NOODLE-002', name: 'Udon Noodle Pack', basePrice: 7.49, packSize: 12 },
    { skuCode: 'SAUCE-001', name: 'Soy Sauce Bottle', basePrice: 3.99, packSize: 24 },
    { skuCode: 'DRINK-001', name: 'Green Tea 500ml', basePrice: 2.49, packSize: 24 },
  ];

  const skus = [];
  for (const data of skuData) {
    const sku = await prisma.sKU.upsert({
      where: { skuCode: data.skuCode },
      update: {},
      create: {
        skuCode: data.skuCode,
        name: data.name,
        basePrice: data.basePrice,
        packSize: data.packSize,
        unitOfMeasure: 'EACH',
        active: true,
      },
    });
    skus.push(sku);
    console.log('Created SKU:', sku.skuCode);
  }

  // Create RetailerSKU mappings
  for (const sku of skus) {
    await prisma.retailerSKU.upsert({
      where: {
        retailerId_skuId: {
          retailerId: retailer.id,
          skuId: sku.id,
        },
      },
      update: {},
      create: {
        retailerId: retailer.id,
        skuId: sku.id,
        active: true,
      },
    });
  }
  console.log('Created RetailerSKU mappings for all SKUs');

  // Create an admin user
  const adminUser = await prisma.retailerUser.upsert({
    where: { email: 'admin@portal.example.com' },
    update: {},
    create: {
      retailerId: retailer.id,
      email: 'admin@portal.example.com',
      name: 'Portal Admin',
      role: 'ADMIN',
      active: true,
    },
  });
  console.log('Created admin user:', adminUser.email);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
