const { Customer } = require('../models');
const { Op } = require('sequelize');

async function list(reqUser, query = {}) {
  const where = {};
  if (reqUser.role !== 'super_admin') where.companyId = reqUser.companyId;
  else if (query.companyId) where.companyId = query.companyId;
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
    ];
  }
  const customers = await Customer.findAll({ where, order: [['name']] });
  return customers;
}

async function getById(id, reqUser) {
  const customer = await Customer.findByPk(id);
  if (!customer) throw new Error('Customer not found');
  if (reqUser.role !== 'super_admin' && customer.companyId !== reqUser.companyId) throw new Error('Customer not found');
  return customer;
}

async function create(data, reqUser) {
  const companyId = reqUser.companyId || data.companyId;
  if (!companyId) throw new Error('companyId required');
  return Customer.create({
    companyId,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
  });
}

async function update(id, data, reqUser) {
  const customer = await Customer.findByPk(id);
  if (!customer) throw new Error('Customer not found');
  if (reqUser.role !== 'super_admin' && customer.companyId !== reqUser.companyId) throw new Error('Customer not found');
  await customer.update({
    name: data.name ?? customer.name,
    email: data.email !== undefined ? data.email : customer.email,
    phone: data.phone !== undefined ? data.phone : customer.phone,
    address: data.address !== undefined ? data.address : customer.address,
  });
  return customer;
}

async function remove(id, reqUser) {
  const customer = await Customer.findByPk(id);
  if (!customer) throw new Error('Customer not found');
  if (reqUser.role !== 'super_admin' && customer.companyId !== reqUser.companyId) throw new Error('Customer not found');
  await customer.destroy();
  return { message: 'Customer deleted' };
}

module.exports = { list, getById, create, update, remove };
