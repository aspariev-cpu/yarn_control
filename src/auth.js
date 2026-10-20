const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function validatePin(pin) {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}
async function hashPin(pin) {
  return bcrypt.hash(pin, 10);
}
async function verifyPin(pin, hash) {
  return bcrypt.compare(pin, hash);
}
function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, tokenVersion: user.tokenVersion },
    JWT_SECRET,
    { expiresIn: '90d' }
  );
}
async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Нет токена' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.active) return res.status(401).json({ error: 'Пользователь недоступен' });
    if (user.tokenVersion !== payload.tokenVersion) return res.status(401).json({ error: 'Токен отозван' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Невалидный токен' });
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Нет доступа' });
    next();
  };
}

module.exports = { validatePin, hashPin, verifyPin, signToken, auth, requireRole };