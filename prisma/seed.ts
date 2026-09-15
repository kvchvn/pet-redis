import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { Catalog, seedCatalog } from './seed-catalog';

const prisma = new PrismaClient();

async function main() {
  const catalog = JSON.parse(
    readFileSync(join(__dirname, 'data', 'catalog.json'), 'utf8'),
  ) as Catalog;

  await seedCatalog(prisma, catalog);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
