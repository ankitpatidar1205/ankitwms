const { SalesOrder, OrderItem, Product, Customer, Company, PickList, PickListItem, PackingTask, Warehouse } = require('../models');
const { Op } = require('sequelize');

async function list(reqUser, query = {}) {
  const where = {};
  if (reqUser.role === 'super_admin') {
    if (query.companyId) where.companyId = query.companyId;
  } else {
    where.companyId = reqUser.companyId;
  }
  if (query.status) where.status = query.status;
  const orders = await SalesOrder.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      { association: 'Company', attributes: ['id', 'name', 'code'] },
      { association: 'Customer', attributes: ['id', 'name', 'email'] },
      { association: 'OrderItems', include: [{ association: 'Product', attributes: ['id', 'name', 'sku'] }] },
    ],
  });
  return orders;
}

async function getById(id, reqUser) {
  const order = await SalesOrder.findByPk(id, {
    include: [
      { association: 'Company' },
      { association: 'Customer' },
      { association: 'OrderItems', include: ['Product'] },
      { association: 'PickLists', include: ['PickListItems', 'Warehouse', 'User'] },
      { association: 'PackingTasks', include: ['User'] },
    ],
  });
  if (!order) throw new Error('Order not found');
  if (reqUser.role !== 'super_admin' && order.companyId !== reqUser.companyId) throw new Error('Order not found');
  return order;
}

async function create(data, reqUser) {
  if (reqUser.role !== 'super_admin' && reqUser.role !== 'company_admin') throw new Error('Only Company Admin can create sales orders');
  const companyId = reqUser.companyId;
  const count = await SalesOrder.count({ where: { companyId } });
  const orderNumber = `ORD-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
  const order = await SalesOrder.create({
    companyId,
    orderNumber,
    customerId: data.customerId || null,
    orderDate: data.orderDate || null,
    requiredDate: data.requiredDate || null,
    priority: data.priority || 'MEDIUM',
    salesChannel: data.salesChannel || 'DIRECT',
    orderType: data.orderType || null,
    referenceNumber: data.referenceNumber || null,
    notes: data.notes || null,
    status: 'pending',
    totalAmount: 0,
    createdBy: reqUser.id,
  });
  let total = 0;
  if (data.items && data.items.length) {
    for (const row of data.items) {
      const product = await Product.findByPk(row.productId);
      if (!product || product.companyId !== companyId) continue;
      const unitPrice = row.unitPrice ?? product.price;
      const qty = row.quantity || 1;
      await OrderItem.create({
        salesOrderId: order.id,
        productId: product.id,
        quantity: qty,
        unitPrice: unitPrice,
      });
      total += Number(unitPrice) * qty;
    }
    await order.update({ totalAmount: total, status: 'pending' });
  }
  const warehouse = await Warehouse.findOne({ where: { companyId } });
  if (warehouse && data.items?.length) {
    const pickList = await PickList.create({
      salesOrderId: order.id,
      warehouseId: warehouse.id,
      status: 'pending',
    });
    for (const row of data.items) {
      await PickListItem.create({
        pickListId: pickList.id,
        productId: row.productId,
        quantityRequired: row.quantity || 1,
        quantityPicked: 0,
      });
    }
    await order.update({ status: 'pick_list_created' });
    await PackingTask.create({
      salesOrderId: order.id,
      pickListId: pickList.id,
      status: 'pending',
    });
  }
  return getById(order.id, reqUser);
}

async function update(id, data, reqUser) {
  const order = await SalesOrder.findByPk(id);
  if (!order) throw new Error('Order not found');
  if (reqUser.role !== 'super_admin' && order.companyId !== reqUser.companyId) throw new Error('Order not found');
  const allowedStatuses = ['pending', 'pick_list_created'];
  if (!allowedStatuses.includes((order.status || '').toLowerCase())) {
    throw new Error('Only pending or pick_list_created orders can be edited');
  }
  await order.update({
    customerId: data.customerId !== undefined ? data.customerId : order.customerId,
    orderDate: data.orderDate !== undefined ? data.orderDate : order.orderDate,
    requiredDate: data.requiredDate !== undefined ? data.requiredDate : order.requiredDate,
    priority: data.priority !== undefined ? data.priority : order.priority,
    salesChannel: data.salesChannel !== undefined ? data.salesChannel : order.salesChannel,
    orderType: data.orderType !== undefined ? data.orderType : order.orderType,
    referenceNumber: data.referenceNumber !== undefined ? data.referenceNumber : order.referenceNumber,
    notes: data.notes !== undefined ? data.notes : order.notes,
  });
  if (data.items && Array.isArray(data.items)) {
    await OrderItem.destroy({ where: { salesOrderId: order.id } });
    let total = 0;
    for (const row of data.items) {
      const product = await Product.findByPk(row.productId);
      if (!product || product.companyId !== order.companyId) continue;
      const unitPrice = row.unitPrice ?? product.price;
      const qty = row.quantity || 1;
      await OrderItem.create({
        salesOrderId: order.id,
        productId: product.id,
        quantity: qty,
        unitPrice: unitPrice,
      });
      total += Number(unitPrice) * qty;
    }
    await order.update({ totalAmount: total });
  }
  return getById(order.id, reqUser);
}

async function remove(id, reqUser) {
  const order = await SalesOrder.findByPk(id);
  if (!order) throw new Error('Order not found');
  if (reqUser.role !== 'super_admin' && order.companyId !== reqUser.companyId) throw new Error('Order not found');
  const allowedStatuses = ['pending', 'pick_list_created'];
  if (!allowedStatuses.includes((order.status || '').toLowerCase())) {
    throw new Error('Only pending or pick_list_created orders can be deleted');
  }
  await OrderItem.destroy({ where: { salesOrderId: order.id } });
  const { PickList, PickListItem, PackingTask } = require('../models');
  const pickLists = await PickList.findAll({ where: { salesOrderId: order.id } });
  for (const pl of pickLists) {
    await PickListItem.destroy({ where: { pickListId: pl.id } });
    await PackingTask.destroy({ where: { pickListId: pl.id } });
    await pl.destroy();
  }
  await order.destroy();
  return { message: 'Order deleted' };
}

module.exports = { list, getById, create, update, remove };
