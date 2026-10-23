require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seed: старт');
  const home = await prisma.location.upsert({ where: { type: 'HOME' }, update: {}, create: { type: 'HOME', name: 'Дом' } });
  const warehouse = await prisma.location.upsert({ where: { type: 'WAREHOUSE' }, update: {}, create: { type: 'WAREHOUSE', name: 'Склад' } });
  await prisma.location.upsert({ where: { type: 'WORKSHOP' }, update: {}, create: { type: 'WORKSHOP', name: 'Цех' } });
  console.log('Локации готовы');

  await prisma.user.upsert({
    where: { id: 'admin-1' },
    update: {},
    create: { id: 'admin-1', name: 'Администратор', pinHash: await bcrypt.hash('1111', 10), role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { id: 'loader-1' },
    update: {},
    create: { id: 'loader-1', name: 'Иван (грузчик)', pinHash: await bcrypt.hash('2222', 10), role: 'LOADER' },
  });

  // ── ДОБАВЛЕНЫ ВЯЗАЛЬЩИКИ ──
  await prisma.user.upsert({
    where: { id: 'knitter-1' },
    update: {},
    create: { id: 'knitter-1', name: 'Аслан', pinHash: 'no-pin', role: 'KNITTER' },
  });
  await prisma.user.upsert({
    where: { id: 'knitter-2' },
    update: {},
    create: { id: 'knitter-2', name: 'Ахмат', pinHash: 'no-pin', role: 'KNITTER' },
  });
  await prisma.user.upsert({
    where: { id: 'knitter-3' },
    update: {},
    create: { id: 'knitter-3', name: 'Игорь', pinHash: 'no-pin', role: 'KNITTER' },
  });
  // ────────────────────────────

  console.log('Пользователи готовы (админ 1111, грузчик 2222, + 3 вязальщика)');

  const yarnsData = [
    { article: '32/2-сер', color: 'серая', composition: 'шерсть 50 / акрил 50', thickness: '32/2' },
    { article: '32/2-бел', color: 'белая', composition: 'шерсть 50 / акрил 50', thickness: '32/2' },
    { article: '30/2-чер', color: 'чёрная', composition: 'акрил 100', thickness: '30/2' },
    { article: '30/2-беж', color: 'бежевая', composition: 'акрил 100', thickness: '30/2' },
    { article: '40/2-син', color: 'синяя', composition: 'хлопок 100', thickness: '40/2' },
  ];
  const yarns = [];
  for (const y of yarnsData) {
    yarns.push(await prisma.yarn.upsert({
      where: { article: y.article },
      update: {},
      create: { ...y, unit: 'меш', status: 'ACTIVE' },
    }));
  }
  console.log('Пряжа готова:', yarns.length);

  const initialCount = await prisma.stockMovement.count({ where: { isInitial: true } });
  if (initialCount === 0) {
    const initial = [
      { yarn: yarns[0], location: warehouse.id, qty: 120 },
      { yarn: yarns[0], location: home.id, qty: 50 },
      { yarn: yarns[1], location: warehouse.id, qty: 80 },
      { yarn: yarns[2], location: warehouse.id, qty: 60 },
      { yarn: yarns[3], location: home.id, qty: 40 },
      { yarn: yarns[4], location: warehouse.id, qty: 100 },
    ];
    for (const row of initial) {
      await prisma.stockMovement.create({
        data: { yarnId: row.yarn.id, locationId: row.location, quantity: new Prisma.Decimal(row.qty), isInitial: true, reason: 'Стартовый остаток' },
      });
    }
    console.log('Стартовые остатки внесены');
  }
  console.log('Seed: готово');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
