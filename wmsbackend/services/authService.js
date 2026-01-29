const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Company } = require('../models');
const { JWT_SECRET } = require('../middlewares/auth');

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function login(email, password) {
  const user = await User.findOne({
    where: { email: email.trim().toLowerCase(), status: 'ACTIVE' },
    include: [
      { association: 'Company', attributes: ['id', 'name', 'code', 'status'] },
      { association: 'Warehouse', attributes: ['id', 'name'] },
    ],
  });
  if (!user) return null;
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return null;
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const u = user.toJSON();
  delete u.passwordHash;
  return { user: u, token };
}

async function createUser(data) {
  const existing = await User.findOne({ where: { email: data.email.trim().toLowerCase() } });
  if (existing) throw new Error('Email already registered');
  const passwordHash = await hashPassword(data.password);
  const user = await User.create({
    email: data.email.trim().toLowerCase(),
    passwordHash,
    name: data.name,
    role: data.role,
    companyId: data.companyId || null,
    warehouseId: data.warehouseId || null,
    status: data.status || 'ACTIVE',
  });
  const u = user.toJSON();
  delete u.passwordHash;
  return u;
}

module.exports = { login, createUser, hashPassword, comparePassword };
