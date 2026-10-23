const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.yarn.updateMany({
    data: { unit: 'меш' }
  });
  console.log('Единицы измерения обновлены на "меш"');
}

main().finally(() => prisma.$disconnect());
