require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { prisma } = require('./db');
const routes = require('./routes');
const { startBot, startCron } = require('./bot');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch (e) {
    res.status(500).json({ ok: false, db: false, error: e.message });
  }
});

app.use('/api', routes);

// Раздача собранного фронта (если есть)
// Раздача собранного фронта (если есть)
// Ищем папку dist сначала в текущей директории, потом на уровень выше
const possiblePaths = [
  path.join(process.cwd(), 'client', 'dist'),
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(process.cwd(), 'dist')
];

let clientDist = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    clientDist = p;
    console.log('✅ Найдена папка с фронтендом:', p); // Это покажет в логах, где он ее нашел
    break;
  }
}

if (clientDist) {
  app.use(express.static(clientDist));
  // Отдаем index.html на любые GET-запросы, которые не начинаются с /api
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  console.log('❌ ВНИМАНИЕ: Папка client/dist не найдена!');
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Ошибка сервера' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
  startBot();
  startCron();
});
