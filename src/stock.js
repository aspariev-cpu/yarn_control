const { Prisma } = require('@prisma/client');
const { prisma } = require('./db');

async function getStock() {
  const yarns = await prisma.yarn.findMany({
    where: { status: { not: 'ARCHIVED' } },
    orderBy: { article: 'asc' },
  });
  const locations = await prisma.location.findMany();
  const locByType = Object.fromEntries(locations.map((l) => [l.type, l.id]));
  const grouped = await prisma.stockMovement.groupBy({
    by: ['yarnId', 'locationId'],
    _sum: { quantity: true },
  });
  const sumBy = (yarnId, type) => {
    const locId = locByType[type];
    const row = grouped.find((g) => g.yarnId === yarnId && g.locationId === locId);
    return row?._sum.quantity ?? new Prisma.Decimal(0);
  };
  return yarns.map((y) => ({
    yarnId: y.id,
    article: y.article,
    color: y.color,
    unit: y.unit,
    home: sumBy(y.id, 'HOME'),
    warehouse: sumBy(y.id, 'WAREHOUSE'),
    workshop: sumBy(y.id, 'WORKSHOP'),
  }));
}

async function getYarnStockAt(yarnId, locationType) {
  const location = await prisma.location.findUnique({ where: { type: locationType } });
  if (!location) return new Prisma.Decimal(0);
  const agg = await prisma.stockMovement.aggregate({
    where: { yarnId, locationId: location.id },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? new Prisma.Decimal(0);
}

async function createTransferMovements(tx, transferId, items) {
  const workshop = await tx.location.findUniqueOrThrow({ where: { type: 'WORKSHOP' } });
  for (const item of items) {
    const qty = new Prisma.Decimal(item.quantity);
    if (item.fromType === 'HOME' || item.fromType === 'WAREHOUSE') {
      const from = await tx.location.findUniqueOrThrow({ where: { type: item.fromType } });
      await tx.stockMovement.create({
        data: { yarnId: item.yarnId, locationId: from.id, quantity: qty.negated(), transferId },
      });
    }
    await tx.stockMovement.create({
      data: { yarnId: item.yarnId, locationId: workshop.id, quantity: qty, transferId },
    });
  }
}

async function createReceiptMovements(tx, receiptId, locationId, items) {
  for (const item of items) {
    await tx.stockMovement.create({
      data: { yarnId: item.yarnId, locationId, quantity: new Prisma.Decimal(item.quantity), receiptId },
    });
  }
}

module.exports = { getStock, getYarnStockAt, createTransferMovements, createReceiptMovements };