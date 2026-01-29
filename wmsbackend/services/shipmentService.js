const { Shipment, SalesOrder, User, Company } = require('../models');
const { Op } = require('sequelize');

async function list(reqUser, query = {}) {
  const where = {};
  if (reqUser.role !== 'super_admin') where.companyId = reqUser.companyId;
  else if (query.companyId) where.companyId = query.companyId;
  if (query.deliveryStatus) where.deliveryStatus = query.deliveryStatus;
  const shipments = await Shipment.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      { association: 'SalesOrder', attributes: ['id', 'orderNumber', 'status'] },
      { association: 'Company', attributes: ['id', 'name', 'code'] },
      { association: 'User', attributes: ['id', 'name', 'email'], required: false },
    ],
  });
  return shipments;
}

async function getById(id, reqUser) {
  const shipment = await Shipment.findByPk(id, {
    include: [
      { association: 'SalesOrder', include: ['Customer', 'OrderItems'] },
      { association: 'Company' },
      { association: 'User', attributes: { exclude: ['passwordHash'] }, required: false },
    ],
  });
  if (!shipment) throw new Error('Shipment not found');
  if (reqUser.role !== 'super_admin' && shipment.companyId !== reqUser.companyId) throw new Error('Shipment not found');
  return shipment;
}

async function create(data, reqUser) {
  const order = await SalesOrder.findByPk(data.salesOrderId);
  if (!order) throw new Error('Order not found');
  if (order.status !== 'packed') throw new Error('Order must be packed first');
  if (reqUser.role !== 'super_admin' && order.companyId !== reqUser.companyId) throw new Error('Order not found');
  const shipment = await Shipment.create({
    salesOrderId: order.id,
    companyId: order.companyId,
    packedBy: reqUser.id,
    courierName: data.courierName || null,
    trackingNumber: data.trackingNumber || null,
    weight: data.weight || null,
    dispatchDate: data.dispatchDate || new Date().toISOString().slice(0, 10),
    deliveryStatus: data.deliveryStatus || 'pending',
  });
  await order.update({ status: 'shipped' });
  return getById(shipment.id, reqUser);
}

async function update(id, data, reqUser) {
  const shipment = await Shipment.findByPk(id);
  if (!shipment) throw new Error('Shipment not found');
  if (reqUser.role !== 'super_admin' && shipment.companyId !== reqUser.companyId) throw new Error('Shipment not found');
  await shipment.update({
    courierName: data.courierName ?? shipment.courierName,
    trackingNumber: data.trackingNumber ?? shipment.trackingNumber,
    weight: data.weight !== undefined ? data.weight : shipment.weight,
    dispatchDate: data.dispatchDate ?? shipment.dispatchDate,
    deliveryStatus: data.deliveryStatus ?? shipment.deliveryStatus,
  });
  return getById(id, reqUser);
}

module.exports = { list, getById, create, update };
