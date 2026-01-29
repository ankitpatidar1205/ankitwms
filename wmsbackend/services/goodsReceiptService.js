const { GoodsReceipt, GoodsReceiptItem, PurchaseOrder, PurchaseOrderItem, Supplier, Product } = require('../models');

async function list(reqUser, query = {}) {
  const where = {};
  if (reqUser.role === 'super_admin') {
    if (query.companyId) where.companyId = query.companyId;
  } else {
    where.companyId = reqUser.companyId;
  }
  if (query.status) where.status = query.status;

  const receipts = await GoodsReceipt.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      { association: 'PurchaseOrder', include: [{ association: 'Supplier', attributes: ['id', 'name'] }] },
      { association: 'GoodsReceiptItems', include: [{ association: 'Product', attributes: ['id', 'name', 'sku'] }] },
    ],
  });
  return receipts;
}

async function getById(id, reqUser) {
  const gr = await GoodsReceipt.findByPk(id, {
    include: [
      { association: 'PurchaseOrder', include: ['Supplier'] },
      { association: 'GoodsReceiptItems', include: ['Product'] },
    ],
  });
  if (!gr) throw new Error('Goods receipt not found');
  if (reqUser.role !== 'super_admin' && gr.companyId !== reqUser.companyId) throw new Error('Goods receipt not found');
  return gr;
}

async function create(body, reqUser) {
  const companyId = reqUser.role === 'super_admin' ? (body.companyId || reqUser.companyId) : reqUser.companyId;
  if (!companyId) throw new Error('Company context required');

  const po = await PurchaseOrder.findByPk(body.purchaseOrderId, {
    include: [{ association: 'PurchaseOrderItems' }],
  });
  if (!po || po.companyId !== companyId) throw new Error('Purchase order not found');
  if ((po.status || '').toLowerCase() !== 'approved') throw new Error('Only approved purchase orders can be received');

  const count = await GoodsReceipt.count({ where: { companyId } });
  const grNumber = `GRN-${Date.now()}-${String(count + 1).padStart(4, '0')}`;

  const totalExpected = (po.PurchaseOrderItems || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  const gr = await GoodsReceipt.create({
    companyId,
    purchaseOrderId: po.id,
    grNumber,
    status: 'pending',
    notes: body.notes || null,
    totalExpected,
    totalReceived: 0,
  });

  const items = (po.PurchaseOrderItems || []).map((i) => ({
    goodsReceiptId: gr.id,
    productId: i.productId,
    productName: i.productName || null,
    productSku: i.productSku || null,
    expectedQty: Number(i.quantity) || 0,
    receivedQty: 0,
    qualityStatus: null,
  }));
  if (items.length) await GoodsReceiptItem.bulkCreate(items);

  return getById(gr.id, reqUser);
}

async function updateReceived(id, body, reqUser) {
  const gr = await GoodsReceipt.findByPk(id, { include: ['GoodsReceiptItems'] });
  if (!gr) throw new Error('Goods receipt not found');
  if (reqUser.role !== 'super_admin' && gr.companyId !== reqUser.companyId) throw new Error('Goods receipt not found');
  if (gr.status === 'completed') throw new Error('Receipt already completed');

  const items = body.items || [];
  for (const row of items) {
    const line = gr.GoodsReceiptItems?.find((i) => i.productId === row.productId || i.id === row.id);
    if (line) {
      const receivedQty = Number(row.receivedQty) ?? line.receivedQty;
      await line.update({ receivedQty, qualityStatus: row.qualityStatus || line.qualityStatus });
    }
  }
  const updated = await GoodsReceipt.findByPk(gr.id, { include: ['GoodsReceiptItems'] });
  const newTotal = (updated.GoodsReceiptItems || []).reduce((s, i) => s + (Number(i.receivedQty) || 0), 0);
  const allReceived = (updated.GoodsReceiptItems || []).every((i) => (Number(i.receivedQty) || 0) >= (Number(i.expectedQty) || 0));
  await updated.update({
    totalReceived: newTotal,
    status: allReceived ? 'completed' : 'in_progress',
  });

  return getById(gr.id, reqUser);
}

async function remove(id, reqUser) {
  const gr = await GoodsReceipt.findByPk(id);
  if (!gr) throw new Error('Goods receipt not found');
  if (reqUser.role !== 'super_admin' && gr.companyId !== reqUser.companyId) throw new Error('Goods receipt not found');
  await GoodsReceiptItem.destroy({ where: { goodsReceiptId: id } });
  await gr.destroy();
  return { deleted: true };
}

module.exports = { list, getById, create, updateReceived, remove };
