const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const { getStock } = require('./stock');

const STOCK_CHANNEL = process.env.DISCORD_STOCK_CHANNEL_ID || '1562095560352211034';
const RECEIPT_CHANNEL = process.env.DISCORD_RECEIPT_CHANNEL_ID || '1562095628505452665';

let client = null;
let ready = false;

function startBot() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.log('[bot] DISCORD_TOKEN не задан — бот не запущен');
    return;
  }
  client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.once('clientReady', () => {
    ready = true;
    console.log(`[bot] Готов: ${client.user.tag}`);
    console.log(`[bot] Канал для остатков: ${STOCK_CHANNEL}`);
    console.log(`[bot] Канал для чеков: ${RECEIPT_CHANNEL}`);
  });
  client.on('error', (e) => console.error('[bot] error', e));
  client.login(token).catch((e) => console.error('[bot] login failed', e.message));
}

async function postStockReport() {
  if (!client || !ready) throw new Error('Бот не готов');
  
  console.log(`[bot] Пытаюсь отправить отчёт в канал: ${STOCK_CHANNEL}`);
  const channel = await client.channels.fetch(STOCK_CHANNEL).catch((err) => {
    throw new Error(`Не удалось найти канал ${STOCK_CHANNEL}: ${err.message}`);
  });

  if (!channel || !channel.isTextBased()) throw new Error('Канал не найден или не текстовый');
  console.log(`[bot] Найден канал: ${channel.name} на сервере ${channel.guild?.name}`);

  const stock = await getStock();
  const rows = stock.filter((s) => Number(s.home) || Number(s.warehouse) || Number(s.workshop));
  const lines = rows.length
    ? rows.map((s) => `**${s.article}**${s.color ? ' ' + s.color : ''} — Дом: ${Number(s.home)} | Склад: ${Number(s.warehouse)} | Цех: ${Number(s.workshop)} ${s.unit}`).join('\n')
    : 'Все остатки нулевые';

  const embed = new EmbedBuilder()
    .setTitle('Остатки пряжи')
    .setDescription(lines.slice(0, 4000))
    .setColor(0x2ecc71)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  console.log('[bot] Отчёт успешно отправлен!');
}

function startCron() {
  cron.schedule('0 9 * * *', () => {
    postStockReport().catch((e) => console.error('[cron] report failed', e.message));
  }, { timezone: 'Europe/Moscow' });
  console.log('[cron] Отчёт: 09:00 Europe/Moscow');
}

// Загрузка фото чека в Discord
async function uploadReceiptPhoto(buffer, filename, contentType, comment) {
  if (!client || !ready) throw new Error('Бот не готов');
  
  const channel = await client.channels.fetch(RECEIPT_CHANNEL);
  if (!channel || !channel.isTextBased()) throw new Error('Канал не найден');

  const msg = await channel.send({
    content: `📸 **Новый чек**\n📍 **Где куплено:** ${comment || 'Не указано'}\n🕒 ${new Date().toLocaleString('ru-RU')}`,
    files: [{ attachment: buffer, name: filename || 'receipt.jpg', contentType }],
  });

  return {
    url: `https://discord.com/channels/${msg.guildId}/${msg.channelId}/${msg.id}`,
    messageId: msg.id,
  };
}

module.exports = { startBot, startCron, postStockReport, uploadReceiptPhoto };