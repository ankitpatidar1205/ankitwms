const { PackingTask, PickList, SalesOrder, User } = require('../models');
const { Op } = require('sequelize');

async function list(reqUser, query = {}) {
  const where = {};
  if (reqUser.role === 'packer') {
    where.assignedTo = reqUser.id;
  } else {
    if (query.status) where.status = query.status;
    const orderWhere = { companyId: reqUser.companyId };
    const tasks = await PackingTask.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        { association: 'SalesOrder', where: orderWhere, required: true, attributes: ['id', 'orderNumber', 'status'] },
        { association: 'User', attributes: ['id', 'name', 'email'], required: false },
      ],
    });
    return tasks;
  }
  const tasks = await PackingTask.findAll({
    where: { assignedTo: reqUser.id },
    order: [['createdAt', 'DESC']],
    include: [
      { association: 'SalesOrder', attributes: ['id', 'orderNumber', 'status'] },
      { association: 'PickList', include: ['PickListItems'] },
    ],
  });
  return tasks;
}

async function getById(id, reqUser) {
  const task = await PackingTask.findByPk(id, {
    include: [
      { association: 'SalesOrder', include: ['OrderItems', 'Customer'] },
      { association: 'PickList', include: ['PickListItems'] },
      { association: 'User', attributes: { exclude: ['passwordHash'] }, required: false },
    ],
  });
  if (!task) throw new Error('Packing task not found');
  if (reqUser.role === 'packer' && task.assignedTo !== reqUser.id) throw new Error('Packing task not found');
  if (reqUser.role === 'company_admin' && task.SalesOrder.companyId !== reqUser.companyId) throw new Error('Packing task not found');
  return task;
}

async function assignPacker(taskId, userId, reqUser) {
  if (reqUser.role !== 'warehouse_manager' && reqUser.role !== 'company_admin' && reqUser.role !== 'super_admin') {
    throw new Error('Only Warehouse Manager can assign packer');
  }
  const task = await PackingTask.findByPk(taskId, { include: ['SalesOrder'] });
  if (!task) throw new Error('Packing task not found');
  if (task.SalesOrder.companyId !== reqUser.companyId && reqUser.role !== 'super_admin') throw new Error('Packing task not found');
  const user = await User.findByPk(userId);
  if (!user || user.role !== 'packer' || user.companyId !== task.SalesOrder.companyId) throw new Error('Invalid packer');
  await task.update({ assignedTo: userId, status: 'pending' });
  return getById(taskId, reqUser);
}

async function completePacking(id, reqUser) {
  const task = await PackingTask.findByPk(id, { include: ['SalesOrder'] });
  if (!task) throw new Error('Packing task not found');
  if (reqUser.role === 'packer' && task.assignedTo !== reqUser.id) throw new Error('Not assigned to you');
  await task.update({ status: 'completed', packedAt: new Date() });
  await task.SalesOrder.update({ status: 'packed' });
  return getById(id, reqUser);
}

module.exports = { list, getById, assignPacker, completePacking };
