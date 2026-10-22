const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // храним в памяти
const { Prisma } = require('@prisma/client');
const { prisma } = require('./db');
const { validatePin, hashPin, verifyPin, signToken, auth, requireRole } = require('./auth');
const { getStock, getYarnStockAt, createTransferMovements, createReceiptMovements } = require('./stock');

const router = express.Router();

// ───── AUTH ─────
router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

router.post('/login', async (req, res) => {
  const { userId, pin } = req.body;
  if (!userId || !validatePin(pin)) return res.status(400).json({ error: 'Нужен userId и PIN из 4 цифр' });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return res.status(401).json({ error: 'Пользователь не найден' });
  const ok = await verifyPin(pin, user.pinHash);
  if (!ok) return res.status(401).json({ error: 'Неверный PIN' });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

router.get('/me', auth, (req, res) => {
  const { id, name, role } = req.user;
  res.json({ id, name, role });
});

// ───── YARNS ─────
router.get('/yarns', auth, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const yarns = await prisma.yarn.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      ...(q ? { OR: [
        { article: { contains: q, mode: 'insensitive' } },
        { color: { contains: q, mode: 'insensitive' } },
        { type: { contains: q, mode: 'insensitive' } }, // Поиск по типу
      ] } : {}),
    },
    orderBy: { article: 'asc' },
    take: 50,
  });
  res.json(yarns);
});

router.get('/yarns/recent', auth, async (req, res) => {
  const items = await prisma.transferItem.findMany({
    where: { transfer: { loaderId: req.user.id, status: 'SENT' } },
    orderBy: { transfer: { createdAt: 'desc' } },
    take: 50,
    include: { yarn: true },
  });
  const seen = new Set();
  const result = [];
  for (const it of items) {
    if (seen.has(it.yarnId)) continue;
    seen.add(it.yarnId);
    result.push(it.yarn);
    if (result.length >= 8) break;
  }
  res.json(result);
});

router.get('/yarns/:id/stock', auth, async (req, res) => {
  const location = (req.query.location || '').toString();
  if (!['HOME', 'WAREHOUSE', 'WORKSHOP'].includes(location)) return res.status(400).json({ error: 'Неверная локация' });
  const qty = await getYarnStockAt(req.params.id, location);
  res.json({ quantity: qty });
});

// ───── STOCK ─────
router.get('/stock', async (_req, res) => {
  res.json(await getStock());
});

// ───── TRANSFERS (грузчик) ─────
router.post('/transfers', auth, requireRole('LOADER', 'ADMIN'), async (req, res) => {
  const { items, note } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Нет позиций' });
  for (const it of items) {
    if (!it.yarnId || !it.quantity || !['HOME', 'WAREHOUSE', 'CITY_BUY'].includes(it.fromType)) return res.status(400).json({ error: 'Неверная позиция' });
    if (Number(it.quantity) <= 0) return res.status(400).json({ error: 'Количество > 0' });
  }
  const transfer = await prisma.$transaction(async (tx) => {
    const created = await tx.transfer.create({
      data: {
        loaderId: req.user.id,
        note: note || null,
        items: {
          create: items.map((it) => ({
            yarnId: it.yarnId,
            quantity: new Prisma.Decimal(it.quantity),
            fromType: it.fromType,
            receiptUrl: it.receiptUrl || null,
          })),
        },
      },
      include: { items: { include: { yarn: true } } },
    });
    await createTransferMovements(tx, created.id, created.items);
    return created;
  });
  res.status(201).json(transfer);
});

router.get('/transfers/my', auth, async (req, res) => {
  const transfers = await prisma.transfer.findMany({
    where: { loaderId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { items: { include: { yarn: true } } },
  });
  res.json(transfers);
});

router.post('/transfers/:id/cancel', auth, async (req, res) => {
  const transfer = await prisma.transfer.findUnique({ where: { id: req.params.id } });
  if (!transfer) return res.status(404).json({ error: 'Не найдено' });
  if (transfer.status === 'CANCELLED') return res.status(400).json({ error: 'Уже отменено' });
  if (req.user.role !== 'ADMIN') {
    if (transfer.loaderId !== req.user.id) return res.status(403).json({ error: 'Не ваше' });
    const ageMin = (Date.now() - transfer.createdAt.getTime()) / 60000;
    if (ageMin > 15) return res.status(403).json({ error: 'Прошло 15 минут' });
  }
  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.deleteMany({ where: { transferId: transfer.id } });
    await tx.transfer.update({ where: { id: transfer.id }, data: { status: 'CANCELLED' } });
  });
  res.json({ ok: true });
});

// ───── UPLOAD RECEIPT ─────
router.post('/upload-receipt', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
    
    const { uploadReceiptPhoto } = require('./bot');
    const result = await uploadReceiptPhoto(
      req.file.buffer, 
      req.file.originalname, 
      req.file.mimetype,
      req.body.comment
    );
    
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ───── ADMIN ─────
const admin = express.Router();
admin.use(auth, requireRole('ADMIN'));

admin.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true, active: true, lastLoginAt: true, createdAt: true },
  });
  res.json(users);
});

admin.post('/users', async (req, res) => {
  const { name, pin, role } = req.body;
  if (!name || !validatePin(pin) || !['LOADER', 'KNITTER', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'Неверные данные' });
  const user = await prisma.user.create({ data: { name, pinHash: await hashPin(pin), role } });
  res.status(201).json({ id: user.id, name: user.name, role: user.role });
});

admin.post('/users/:id/pin', async (req, res) => {
  const { pin } = req.body;
  if (!validatePin(pin)) return res.status(400).json({ error: 'PIN 4 цифры' });
  await prisma.user.update({ where: { id: req.params.id }, data: { pinHash: await hashPin(pin), tokenVersion: { increment: 1 } } });
  res.json({ ok: true });
});

admin.post('/users/:id/deactivate', async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { active: false, tokenVersion: { increment: 1 } } });
  res.json({ ok: true });
});

// СОЗДАНИЕ ПРЯЖИ (Добавлен type)
admin.post('/yarns', async (req, res) => {
  const { article, type, color, composition, thickness, unit } = req.body;
  if (!article) return res.status(400).json({ error: 'Нужен артикул' });
  const yarn = await prisma.yarn.create({
    data: { 
      article, 
      type: type || null, 
      color: color || null, 
      composition: composition || null, 
      thickness: thickness || null, 
      unit: unit || 'меш', 
      status: 'ACTIVE' 
    },
  });
  res.status(201).json(yarn);
});

// РЕДАКТИРОВАНИЕ ПРЯЖИ (Поддерживает частичное обновление, в т.ч. только type)
admin.put('/yarns/:id', async (req, res) => {
  const { article, type } = req.body;
  try {
    const dataToUpdate = {};
    if (article) dataToUpdate.article = article;
    if (type !== undefined) dataToUpdate.type = type;

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    const updated = await prisma.yarn.update({
      where: { id: req.params.id },
      data: dataToUpdate
    });
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'Такая пряжа уже есть' });
    res.status(500).json({ error: e.message });
  }
});

// Удаление пряжи (архивация)
admin.delete('/yarns/:id', async (req, res) => {
  try {
    await prisma.yarn.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' }
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

admin.post('/receipts', async (req, res) => {
  const { locationType, items, note } = req.body;
  if (!['HOME', 'WAREHOUSE', 'WORKSHOP'].includes(locationType)) return res.status(400).json({ error: 'Неверная локация' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Нет позиций' });
  const location = await prisma.location.findUnique({ where: { type: locationType } });
  if (!location) return res.status(400).json({ error: 'Локация не найдена' });
  const receipt = await prisma.$transaction(async (tx) => {
    const created = await tx.receipt.create({
      data: {
        adminId: req.user.id,
        locationId: location.id,
        note: note || null,
        items: { create: items.map((it) => ({ yarnId: it.yarnId, quantity: new Prisma.Decimal(it.quantity) })) },
      },
      include: { items: { include: { yarn: true } } },
    });
    await createReceiptMovements(tx, created.id, location.id, created.items);
    return created;
  });
  res.status(201).json(receipt);
});

admin.get('/transfers', async (_req, res) => {
  const transfers = await prisma.transfer.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { items: { include: { yarn: true } }, loader: true },
  });
  res.json(transfers);
});

admin.post('/reports/stock', async (_req, res) => {
  try {
    const { postStockReport } = require('./bot');
    await postStockReport();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.use('/admin', admin);

module.exports = router;
