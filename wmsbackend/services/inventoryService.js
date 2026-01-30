const { Product, Category, ProductStock, Warehouse, Company, Supplier, InventoryAdjustment, CycleCount, Batch, Movement } = require('../models');
const { Op } = require('sequelize');

async function listProducts(reqUser, query = {}) {
  const where = {};
  if (reqUser.role !== 'super_admin') where.companyId = reqUser.companyId;
  else if (query.companyId) where.companyId = query.companyId;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.status) where.status = query.status;
  if (query.search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { sku: { [Op.like]: `%${query.search}%` } },
    ];
  }
  const products = await Product.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      { association: 'Category', attributes: ['id', 'name', 'code'], required: false },
      { association: 'Company', attributes: ['id', 'name', 'code'], required: false },
    ],
  });
  return products;
}

async function listCategories(reqUser, query = {}) {
  const where = {};
  if (reqUser.role !== 'super_admin') where.companyId = reqUser.companyId;
  else if (query.companyId) where.companyId = query.companyId;
  const categories = await Category.findAll({
    where,
    order: [['name']],
    include: [{ association: 'Products', attributes: ['id'], required: false }],
  });
  return categories.map(c => {
    const j = c.toJSON();
    j.productCount = (j.Products && j.Products.length) || 0;
    delete j.Products;
    return j;
  });
}

async function getProductById(id, reqUser) {
  const product = await Product.findByPk(id, {
    include: [
      { association: 'Category' },
      { association: 'Company', attributes: ['id', 'name', 'code'] },
      { association: 'Supplier', attributes: ['id', 'name', 'code'] },
      { association: 'ProductStocks', include: ['Warehouse', 'Location'] },
    ],
  });
  if (!product) throw new Error('Product not found');
  if (reqUser.role !== 'super_admin' && product.companyId !== reqUser.companyId) throw new Error('Product not found');
  return product;
}

async function createProduct(data, reqUser) {
  if (reqUser.role !== 'super_admin' && reqUser.role !== 'company_admin' && reqUser.role !== 'inventory_manager') {
    throw new Error('Not allowed to create product');
  }
  const companyId = reqUser.companyId || data.companyId;
  if (!companyId) throw new Error('companyId required');
  const existing = await Product.findOne({ where: { companyId, sku: data.sku.trim() } });
  if (existing) throw new Error('SKU already exists for this company');
  return Product.create({
    companyId,
    categoryId: data.categoryId || null,
    supplierId: data.supplierId || null,
    name: data.name,
    sku: data.sku.trim(),
    barcode: data.barcode || null,
    description: data.description || null,
    productType: data.productType || null,
    unitOfMeasure: data.unitOfMeasure || null,
    price: data.price ?? 0,
    costPrice: data.costPrice != null ? data.costPrice : null,
    vatRate: data.vatRate != null ? data.vatRate : null,
    vatCode: data.vatCode || null,
    customsTariff: data.customsTariff != null ? String(data.customsTariff) : null,
    marketplaceSkus: data.marketplaceSkus && typeof data.marketplaceSkus === 'object' ? data.marketplaceSkus : null,
    heatSensitive: data.heatSensitive || null,
    perishable: data.perishable || null,
    requireBatchTracking: data.requireBatchTracking || null,
    shelfLifeDays: data.shelfLifeDays != null ? data.shelfLifeDays : null,
    length: data.length != null ? data.length : null,
    width: data.width != null ? data.width : null,
    height: data.height != null ? data.height : null,
    dimensionUnit: data.dimensionUnit || null,
    weight: data.weight != null ? data.weight : null,
    weightUnit: data.weightUnit || null,
    reorderLevel: data.reorderLevel ?? 0,
    reorderQty: data.reorderQty != null ? data.reorderQty : null,
    maxStock: data.maxStock != null ? data.maxStock : null,
    status: data.status || 'ACTIVE',
    images: Array.isArray(data.images) ? data.images : null,
    cartons: data.cartons && typeof data.cartons === 'object' ? data.cartons : null,
    priceLists: data.priceLists && typeof data.priceLists === 'object' ? data.priceLists : null,
    supplierProducts: Array.isArray(data.supplierProducts) ? data.supplierProducts : null,
    alternativeSkus: Array.isArray(data.alternativeSkus) ? data.alternativeSkus : null,
  });
}

async function bulkCreateProducts(productsArray, reqUser) {
  if (reqUser.role !== 'super_admin' && reqUser.role !== 'company_admin' && reqUser.role !== 'inventory_manager') {
    throw new Error('Not allowed to import products');
  }
  const companyId = reqUser.companyId;
  if (!companyId) throw new Error('Company required');
  if (!Array.isArray(productsArray) || productsArray.length === 0) {
    throw new Error('No products to import');
  }
  const results = { created: 0, skipped: 0, errors: [] };
  for (let i = 0; i < productsArray.length; i++) {
    const data = productsArray[i];
    try {
      if (!data || !data.sku || !data.name) {
        results.skipped++;
        results.errors.push({ row: i + 1, message: 'SKU and Product Name required' });
        continue;
      }
      const existing = await Product.findOne({ where: { companyId, sku: String(data.sku).trim() } });
      if (existing) {
        results.skipped++;
        results.errors.push({ row: i + 1, sku: data.sku, message: 'SKU already exists' });
        continue;
      }
      await Product.create({
        companyId,
        categoryId: data.categoryId != null ? data.categoryId : null,
        supplierId: data.supplierId != null ? data.supplierId : null,
        name: String(data.name).trim(),
        sku: String(data.sku).trim(),
        barcode: data.barcode ? String(data.barcode).trim() : null,
        description: data.description ? String(data.description).trim() : null,
        productType: data.productType || null,
        unitOfMeasure: data.unitOfMeasure || null,
        price: data.price != null ? Number(data.price) : 0,
        costPrice: data.costPrice != null ? Number(data.costPrice) : null,
        vatRate: data.vatRate != null ? Number(data.vatRate) : null,
        vatCode: data.vatCode || null,
        customsTariff: data.customsTariff != null ? String(data.customsTariff) : null,
        marketplaceSkus: data.marketplaceSkus && typeof data.marketplaceSkus === 'object' ? data.marketplaceSkus : null,
        heatSensitive: data.heatSensitive || null,
        perishable: data.perishable || null,
        requireBatchTracking: data.requireBatchTracking || null,
        shelfLifeDays: data.shelfLifeDays != null ? Number(data.shelfLifeDays) : null,
        length: data.length != null ? Number(data.length) : null,
        width: data.width != null ? Number(data.width) : null,
        height: data.height != null ? Number(data.height) : null,
        dimensionUnit: data.dimensionUnit || null,
        weight: data.weight != null ? Number(data.weight) : null,
        weightUnit: data.weightUnit || null,
        reorderLevel: data.reorderLevel != null ? Number(data.reorderLevel) : 0,
        reorderQty: data.reorderQty != null ? Number(data.reorderQty) : null,
        maxStock: data.maxStock != null ? Number(data.maxStock) : null,
        status: data.status && String(data.status).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        images: null,
        cartons: null,
        priceLists: null,
        supplierProducts: null,
        alternativeSkus: null,
      });
      results.created++;
    } catch (err) {
      results.skipped++;
      results.errors.push({ row: i + 1, sku: data?.sku, message: err.message || 'Failed' });
    }
  }
  return results;
}

async function updateProduct(id, data, reqUser) {
  const product = await Product.findByPk(id);
  if (!product) throw new Error('Product not found');
  if (reqUser.role !== 'super_admin' && product.companyId !== reqUser.companyId) throw new Error('Product not found');
  const upd = {
    name: data.name ?? product.name,
    categoryId: data.categoryId !== undefined ? data.categoryId : product.categoryId,
    supplierId: data.supplierId !== undefined ? data.supplierId : product.supplierId,
    sku: data.sku?.trim() ?? product.sku,
    barcode: data.barcode !== undefined ? data.barcode : product.barcode,
    description: data.description !== undefined ? data.description : product.description,
    productType: data.productType !== undefined ? data.productType : product.productType,
    unitOfMeasure: data.unitOfMeasure !== undefined ? data.unitOfMeasure : product.unitOfMeasure,
    price: data.price !== undefined ? data.price : product.price,
    costPrice: data.costPrice !== undefined ? data.costPrice : product.costPrice,
    vatRate: data.vatRate !== undefined ? data.vatRate : product.vatRate,
    vatCode: data.vatCode !== undefined ? data.vatCode : product.vatCode,
    customsTariff: data.customsTariff !== undefined ? (data.customsTariff != null ? String(data.customsTariff) : null) : product.customsTariff,
    marketplaceSkus: data.marketplaceSkus !== undefined ? (data.marketplaceSkus && typeof data.marketplaceSkus === 'object' ? data.marketplaceSkus : product.marketplaceSkus) : product.marketplaceSkus,
    heatSensitive: data.heatSensitive !== undefined ? data.heatSensitive : product.heatSensitive,
    perishable: data.perishable !== undefined ? data.perishable : product.perishable,
    requireBatchTracking: data.requireBatchTracking !== undefined ? data.requireBatchTracking : product.requireBatchTracking,
    shelfLifeDays: data.shelfLifeDays !== undefined ? data.shelfLifeDays : product.shelfLifeDays,
    length: data.length !== undefined ? data.length : product.length,
    width: data.width !== undefined ? data.width : product.width,
    height: data.height !== undefined ? data.height : product.height,
    dimensionUnit: data.dimensionUnit !== undefined ? data.dimensionUnit : product.dimensionUnit,
    weight: data.weight !== undefined ? data.weight : product.weight,
    weightUnit: data.weightUnit !== undefined ? data.weightUnit : product.weightUnit,
    reorderLevel: data.reorderLevel !== undefined ? data.reorderLevel : product.reorderLevel,
    reorderQty: data.reorderQty !== undefined ? data.reorderQty : product.reorderQty,
    maxStock: data.maxStock !== undefined ? data.maxStock : product.maxStock,
    status: data.status ?? product.status,
    images: data.images !== undefined ? (Array.isArray(data.images) ? data.images : product.images) : product.images,
    cartons: data.cartons !== undefined ? (data.cartons && typeof data.cartons === 'object' ? data.cartons : product.cartons) : product.cartons,
    priceLists: data.priceLists !== undefined ? (data.priceLists && typeof data.priceLists === 'object' ? data.priceLists : product.priceLists) : product.priceLists,
    supplierProducts: data.supplierProducts !== undefined ? (Array.isArray(data.supplierProducts) ? data.supplierProducts : product.supplierProducts) : product.supplierProducts,
    alternativeSkus: data.alternativeSkus !== undefined ? (Array.isArray(data.alternativeSkus) ? data.alternativeSkus : product.alternativeSkus) : product.alternativeSkus,
  };
  await product.update(upd);
  return product;
}

async function removeProduct(id, reqUser) {
  const product = await Product.findByPk(id);
  if (!product) throw new Error('Product not found');
  if (reqUser.role !== 'super_admin' && product.companyId !== reqUser.companyId) throw new Error('Product not found');
  await ProductStock.destroy({ where: { productId: id } });
  await product.destroy();
  return { message: 'Product deleted' };
}

async function createCategory(data, reqUser) {
  const companyId = reqUser.companyId || data.companyId;
  if (!companyId) throw new Error('companyId required');
  const code = data.code?.trim() || data.name.replace(/\s/g, '_').toUpperCase().slice(0, 50);
  const existing = await Category.findOne({ where: { companyId, code } });
  if (existing) throw new Error('Category code already exists for this company');
  return Category.create({
    companyId,
    name: data.name,
    code,
  });
}

async function updateCategory(id, data, reqUser) {
  const cat = await Category.findByPk(id);
  if (!cat) throw new Error('Category not found');
  if (reqUser.role !== 'super_admin' && cat.companyId !== reqUser.companyId) throw new Error('Category not found');
  await cat.update({
    name: data.name ?? cat.name,
    code: data.code?.trim() ?? cat.code,
  });
  return cat;
}

async function removeCategory(id, reqUser) {
  const cat = await Category.findByPk(id);
  if (!cat) throw new Error('Category not found');
  if (reqUser.role !== 'super_admin' && cat.companyId !== reqUser.companyId) throw new Error('Category not found');
  await cat.destroy();
  return { message: 'Category deleted' };
}

async function listStock(reqUser, query = {}) {
  const where = {};
  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.productId) where.productId = query.productId;
  const stocks = await ProductStock.findAll({
    where,
    include: [
      { association: 'Product', where: reqUser.role !== 'super_admin' ? { companyId: reqUser.companyId } : undefined, required: reqUser.role !== 'super_admin' },
      { association: 'Warehouse', include: ['Company'] },
      { association: 'Location', required: false },
    ],
  });
  return stocks;
}

async function createStock(data, reqUser) {
  const { Product } = require('../models');
  const product = await Product.findByPk(data.productId);
  if (!product) throw new Error('Product not found');
  if (reqUser.role !== 'super_admin' && product.companyId !== reqUser.companyId) throw new Error('Product not found');
  const stock = await ProductStock.create({
    productId: data.productId,
    warehouseId: data.warehouseId,
    locationId: data.locationId || null,
    quantity: data.quantity ?? 0,
    reserved: data.reserved ?? 0,
    status: data.status || 'ACTIVE',
    lotNumber: data.lotNumber || null,
    batchNumber: data.batchNumber || null,
    serialNumber: data.serialNumber || null,
    bestBeforeDate: data.bestBeforeDate || null,
  });
  return ProductStock.findByPk(stock.id, {
    include: [
      { association: 'Product' },
      { association: 'Warehouse' },
      { association: 'Location', required: false },
    ],
  });
}

async function updateStock(stockId, data, reqUser) {
  const stock = await ProductStock.findByPk(stockId, { include: ['Product'] });
  if (!stock) throw new Error('Stock not found');
  if (reqUser.role !== 'super_admin' && reqUser.role !== 'inventory_manager' && reqUser.role !== 'company_admin') {
    throw new Error('Not allowed');
  }
  if (stock.Product.companyId !== reqUser.companyId && reqUser.role !== 'super_admin') throw new Error('Stock not found');
  await stock.update({
    quantity: data.quantity !== undefined ? data.quantity : stock.quantity,
    reserved: data.reserved !== undefined ? data.reserved : stock.reserved,
    locationId: data.locationId !== undefined ? data.locationId : stock.locationId,
    status: data.status !== undefined ? data.status : stock.status,
    lotNumber: data.lotNumber !== undefined ? data.lotNumber : stock.lotNumber,
    batchNumber: data.batchNumber !== undefined ? data.batchNumber : stock.batchNumber,
    serialNumber: data.serialNumber !== undefined ? data.serialNumber : stock.serialNumber,
    bestBeforeDate: data.bestBeforeDate !== undefined ? data.bestBeforeDate : stock.bestBeforeDate,
  });
  return stock;
}

async function removeStock(stockId, reqUser) {
  const stock = await ProductStock.findByPk(stockId, { include: ['Product'] });
  if (!stock) throw new Error('Stock not found');
  if (reqUser.role !== 'super_admin' && reqUser.role !== 'inventory_manager' && reqUser.role !== 'company_admin') throw new Error('Not allowed');
  if (stock.Product && stock.Product.companyId !== reqUser.companyId && reqUser.role !== 'super_admin') throw new Error('Stock not found');
  await stock.destroy();
  return { message: 'Stock record deleted' };
}

async function listStockByBestBeforeDate(reqUser, query = {}) {
  const where = {};
  if (query.productId) where.productId = query.productId;
  if (query.warehouseId) where.warehouseId = query.warehouseId;
  const hasDateFilter = query.minBbd || query.maxBbd;
  if (hasDateFilter) {
    const bbdCond = [{ [Op.ne]: null }];
    if (query.minBbd) bbdCond.push({ [Op.gte]: query.minBbd });
    if (query.maxBbd) bbdCond.push({ [Op.lte]: query.maxBbd });
    where.bestBeforeDate = { [Op.and]: bbdCond };
  }
  // when no date filter: return all stock (including bestBeforeDate = null) so report shows data
  const productWhere = (reqUser.role !== 'super_admin' && reqUser.companyId) ? { companyId: reqUser.companyId } : undefined;
  const stocks = await ProductStock.findAll({
    where,
    include: [
      { association: 'Product', where: productWhere, required: !!productWhere, attributes: ['id', 'name', 'sku'] },
      { association: 'Warehouse', attributes: ['id', 'name'] },
    ],
  });
  const byKey = {};
  for (const s of stocks) {
    const key = `${s.productId}-${s.bestBeforeDate}`;
    if (!byKey[key]) {
      byKey[key] = {
        productId: s.productId,
        productName: s.Product?.name,
        productSku: s.Product?.sku,
        bestBeforeDate: s.bestBeforeDate,
        totalAvailable: 0,
        bbdCount: 0,
      };
    }
    byKey[key].totalAvailable += Math.max(0, (s.quantity || 0) - (s.reserved || 0));
    byKey[key].bbdCount += 1;
  }
  return Object.values(byKey).sort((a, b) => (a.bestBeforeDate || '').localeCompare(b.bestBeforeDate || ''));
}

async function listStockByLocation(reqUser, query = {}) {
  const { Location, Zone } = require('../models');
  const where = {};
  if (query.warehouseId) where.warehouseId = query.warehouseId;
  const productWhere = (reqUser.role !== 'super_admin' && reqUser.companyId) ? { companyId: reqUser.companyId } : undefined;
  const include = [
    { association: 'Product', where: productWhere, required: !!productWhere, attributes: ['id', 'name', 'sku'] },
    { association: 'Warehouse', attributes: ['id', 'name'] },
    { association: 'Location', required: false, include: [{ association: 'Zone', attributes: ['id', 'name', 'code'] }] },
  ];
  const stocks = await ProductStock.findAll({ where, include });
  const byLoc = {};
  for (const s of stocks) {
    const locId = s.locationId || 0;
    const loc = s.Location;
    if (query.locationType && loc && loc.locationType !== query.locationType) continue;
    if (!byLoc[locId]) {
      byLoc[locId] = {
        locationId: locId || null,
        locationName: loc?.name || 'Unassigned',
        locationCode: loc?.code || '—',
        locationType: loc?.locationType || '—',
        zoneName: loc?.Zone?.name || loc?.Zone?.code || '—',
        properties: loc?.heatSensitive === 'yes' ? 'Hot Location' : (loc?.heatSensitive ? String(loc.heatSensitive) : '—'),
        pickSequence: loc?.pickSequence ?? null,
        totalItems: 0,
        productIds: new Set(),
        warnings: [],
      };
    }
    byLoc[locId].totalItems += (s.quantity || 0);
    byLoc[locId].productIds.add(s.productId);
    if (s.bestBeforeDate && new Date(s.bestBeforeDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      if (!byLoc[locId].warnings.includes('Expiring soon')) byLoc[locId].warnings.push('Expiring soon');
    }
  }
  return Object.values(byLoc)
    .map((r) => ({ ...r, productCount: r.productIds.size, productIds: undefined, warnings: r.warnings.length ? r.warnings.join('; ') : '—' }))
    .sort((a, b) => (a.pickSequence != null && b.pickSequence != null ? a.pickSequence - b.pickSequence : (a.locationCode || '').localeCompare(b.locationCode || '')));
}

function generateAdjustmentReference() {
  return 'ADJ-' + Buffer.from(Date.now().toString(36) + Math.random().toString(36).slice(2)).toString('base64').replace(/[/+=]/g, '').slice(0, 8).toUpperCase();
}

async function listAdjustments(reqUser, query = {}) {
  const where = {};
  if (reqUser.role !== 'super_admin') where.companyId = reqUser.companyId;
  if (query.type) where.type = query.type;
  if (query.status) where.status = query.status;
  if (query.search) {
    where[Op.or] = [
      { referenceNumber: { [Op.like]: `%${query.search}%` } },
      { reason: { [Op.like]: `%${query.search}%` } },
    ];
  }
  const list = await InventoryAdjustment.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      { association: 'Product', attributes: ['id', 'name', 'sku'] },
      { association: 'Warehouse', required: false, attributes: ['id', 'name'] },
      { association: 'createdByUser', required: false, attributes: ['id', 'name', 'email'] },
    ],
  });
  return list.map((a) => {
    const j = a.toJSON();
    j.items = [{ product: j.Product, quantity: j.quantity }];
    j.createdBy = j.createdByUser;
    delete j.createdByUser;
    delete j.Product;
    return j;
  });
}

async function createAdjustment(data, reqUser) {
  if (reqUser.role !== 'super_admin' && reqUser.role !== 'company_admin' && reqUser.role !== 'inventory_manager') {
    throw new Error('Not allowed to create adjustment');
  }
  const companyId = reqUser.companyId || data.companyId;
  if (!companyId) throw new Error('Company context required');
  const product = await Product.findByPk(data.productId);
  if (!product) throw new Error('Product not found');
  if (product.companyId !== companyId && reqUser.role !== 'super_admin') throw new Error('Product not found');
  const qty = Math.abs(parseInt(data.quantity, 10) || 0);
  if (qty < 1) throw new Error('Quantity must be at least 1');
  const type = (data.type || '').toUpperCase() === 'DECREASE' ? 'DECREASE' : 'INCREASE';
  const referenceNumber = generateAdjustmentReference();
  let warehouseId = data.warehouseId || null;
  const stockWhere = { productId: data.productId };
  if (warehouseId) stockWhere.warehouseId = warehouseId;
  let stock = await ProductStock.findOne({ where: stockWhere });
  if (!stock && !warehouseId) {
    stock = await ProductStock.findOne({ where: { productId: data.productId } });
    if (stock) warehouseId = stock.warehouseId;
  }
  if (type === 'DECREASE' && (!stock || (stock.quantity || 0) - (stock.reserved || 0) < qty)) {
    throw new Error('Insufficient available stock for decrease');
  }
  const adjustment = await InventoryAdjustment.create({
    referenceNumber,
    companyId,
    productId: data.productId,
    warehouseId: warehouseId || (stock && stock.warehouseId) || null,
    type,
    quantity: qty,
    reason: data.reason || null,
    notes: data.notes || null,
    status: 'PENDING',
    createdBy: reqUser.id,
  });
  if (stock) {
    const newQty = type === 'INCREASE' ? (stock.quantity || 0) + qty : Math.max(0, (stock.quantity || 0) - qty);
    await stock.update({ quantity: newQty });
  } else if (type === 'INCREASE') {
    if (!warehouseId) {
      const { Warehouse } = require('../models');
      const firstWarehouse = await Warehouse.findOne({ where: { companyId } });
      if (!firstWarehouse) throw new Error('No warehouse found for company');
      warehouseId = firstWarehouse.id;
      await ProductStock.create({
        productId: data.productId,
        warehouseId,
        quantity: qty,
        reserved: 0,
      });
    }
  }
  await adjustment.update({ status: 'COMPLETED' });
  return InventoryAdjustment.findByPk(adjustment.id, {
    include: [
      { association: 'Product', attributes: ['id', 'name', 'sku'] },
      { association: 'Warehouse', required: false, attributes: ['id', 'name'] },
      { association: 'createdByUser', required: false, attributes: ['id', 'name', 'email'] },
    ],
  }).then((a) => {
    const j = a.toJSON();
    j.items = [{ product: j.Product, quantity: j.quantity }];
    j.createdBy = j.createdByUser;
    delete j.createdByUser;
    delete j.Product;
    return j;
  });
}

async function listCycleCounts(reqUser, query = {}) {
  const where = {};
  if (reqUser.role !== 'super_admin') where.companyId = reqUser.companyId;
  if (query.status) where.status = query.status;
  if (query.search) {
    where[Op.or] = [
      { referenceNumber: { [Op.like]: `%${query.search}%` } },
      { countName: { [Op.like]: `%${query.search}%` } },
    ];
  }
  const list = await CycleCount.findAll({
    where,
    order: [['scheduledDate', 'DESC'], ['createdAt', 'DESC']],
    include: [
      { association: 'Location', required: false, attributes: ['id', 'name', 'code', 'aisle', 'rack', 'shelf', 'bin'] },
      { association: 'countedByUser', required: false, attributes: ['id', 'name', 'email'] },
    ],
  });
  return list.map((c) => {
    const j = c.toJSON();
    j.countedBy = j.countedByUser;
    delete j.countedByUser;
    return j;
  });
}

async function createCycleCount(data, reqUser) {
  if (reqUser.role !== 'super_admin' && reqUser.role !== 'company_admin' && reqUser.role !== 'inventory_manager' && reqUser.role !== 'warehouse_manager') {
    throw new Error('Not allowed to create cycle count');
  }
  const companyId = reqUser.companyId || data.companyId;
  if (!companyId) throw new Error('Company context required');
  const count = await CycleCount.create({
    companyId,
    countName: data.countName || 'Cycle Count',
    countType: data.countType || null,
    locationId: data.locationId || null,
    scheduledDate: data.scheduledDate || null,
    notes: data.notes || null,
    status: 'PENDING',
    itemsCount: 0,
    discrepancies: 0,
    countedBy: null,
  });
  const refNum = 'CC-' + String(count.id).padStart(5, '0');
  await count.update({ referenceNumber: refNum });
  return CycleCount.findByPk(count.id, {
    include: [
      { association: 'Location', required: false, attributes: ['id', 'name', 'code', 'aisle', 'rack', 'shelf', 'bin'] },
      { association: 'countedByUser', required: false, attributes: ['id', 'name', 'email'] },
    ],
  }).then((c) => {
    const j = c.toJSON();
    j.countedBy = j.countedByUser;
    delete j.countedByUser;
    return j;
  });
}

async function listBatches(reqUser, query = {}) {
  const where = {};
  if (reqUser.role !== 'super_admin') where.companyId = reqUser.companyId;
  if (query.status) where.status = query.status;
  if (query.productId) where.productId = query.productId;
  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.search) {
    where[Op.or] = [
      { batchNumber: { [Op.like]: `%${query.search}%` } },
    ];
  }
  const list = await Batch.findAll({
    where,
    order: [['receivedDate', 'DESC'], ['createdAt', 'DESC']],
    include: [
      { association: 'Product', attributes: ['id', 'name', 'sku'] },
      { association: 'Warehouse', attributes: ['id', 'name', 'code'] },
      { association: 'Location', required: false, attributes: ['id', 'name', 'code', 'aisle', 'rack', 'shelf', 'bin'] },
      { association: 'Supplier', required: false, attributes: ['id', 'name', 'code'] },
    ],
  });
  return list.map((b) => {
    const j = b.toJSON();
    j.availableQuantity = Math.max(0, (b.quantity || 0) - (b.reserved || 0));
    return j;
  });
}

async function createBatch(data, reqUser) {
  if (reqUser.role !== 'super_admin' && reqUser.role !== 'company_admin' && reqUser.role !== 'inventory_manager' && reqUser.role !== 'warehouse_manager') {
    throw new Error('Not allowed to create batch');
  }
  const companyId = reqUser.companyId || data.companyId;
  if (!companyId) throw new Error('Company context required');
  const product = await Product.findByPk(data.productId);
  if (!product) throw new Error('Product not found');
  if (product.companyId !== companyId && reqUser.role !== 'super_admin') throw new Error('Product not found');
  const batch = await Batch.create({
    companyId,
    batchNumber: data.batchNumber || String(Date.now()),
    productId: data.productId,
    warehouseId: data.warehouseId,
    locationId: data.locationId || null,
    quantity: parseInt(data.quantity, 10) || 0,
    reserved: 0,
    unitCost: data.unitCost != null ? parseFloat(data.unitCost) : null,
    receivedDate: data.receivedDate || null,
    expiryDate: data.expiryDate || null,
    manufacturingDate: data.manufacturingDate || null,
    supplierId: data.supplierId || null,
    status: 'ACTIVE',
  });
  return getBatchById(batch.id, reqUser);
}

async function getBatchById(id, reqUser) {
  const batch = await Batch.findByPk(id, {
    include: [
      { association: 'Product', attributes: ['id', 'name', 'sku'] },
      { association: 'Warehouse', attributes: ['id', 'name', 'code'] },
      { association: 'Location', required: false, attributes: ['id', 'name', 'code', 'aisle', 'rack', 'shelf', 'bin'] },
      { association: 'Supplier', required: false, attributes: ['id', 'name', 'code'] },
    ],
  });
  if (!batch) throw new Error('Batch not found');
  if (reqUser.role !== 'super_admin' && batch.companyId !== reqUser.companyId) throw new Error('Batch not found');
  const j = batch.toJSON();
  j.availableQuantity = Math.max(0, (batch.quantity || 0) - (batch.reserved || 0));
  return j;
}

async function updateBatch(id, data, reqUser) {
  const batch = await Batch.findByPk(id, { include: ['Product'] });
  if (!batch) throw new Error('Batch not found');
  if (reqUser.role !== 'super_admin' && batch.companyId !== reqUser.companyId) throw new Error('Batch not found');
  await batch.update({
    batchNumber: data.batchNumber !== undefined ? data.batchNumber : batch.batchNumber,
    locationId: data.locationId !== undefined ? data.locationId : batch.locationId,
    quantity: data.quantity !== undefined ? parseInt(data.quantity, 10) : batch.quantity,
    unitCost: data.unitCost !== undefined ? (data.unitCost == null ? null : parseFloat(data.unitCost)) : batch.unitCost,
    receivedDate: data.receivedDate !== undefined ? data.receivedDate : batch.receivedDate,
    expiryDate: data.expiryDate !== undefined ? data.expiryDate : batch.expiryDate,
    manufacturingDate: data.manufacturingDate !== undefined ? data.manufacturingDate : batch.manufacturingDate,
    supplierId: data.supplierId !== undefined ? data.supplierId : batch.supplierId,
    status: data.status !== undefined ? data.status : batch.status,
  });
  return getBatchById(batch.id, reqUser);
}

async function removeBatch(id, reqUser) {
  const batch = await Batch.findByPk(id);
  if (!batch) throw new Error('Batch not found');
  if (reqUser.role !== 'super_admin' && batch.companyId !== reqUser.companyId) throw new Error('Batch not found');
  await batch.destroy();
  return { message: 'Batch deleted' };
}

async function listMovements(reqUser, query = {}) {
  const where = {};
  if (reqUser.role !== 'super_admin') where.companyId = reqUser.companyId;
  if (query.type) where.type = query.type;
  if (query.startDate || query.endDate) {
    const dateCond = {};
    if (query.startDate) dateCond[Op.gte] = new Date(query.startDate + 'T00:00:00');
    if (query.endDate) dateCond[Op.lte] = new Date(query.endDate + 'T23:59:59');
    where.createdAt = dateCond;
  }
  const list = await Movement.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      { association: 'Product', attributes: ['id', 'name', 'sku'] },
      { association: 'Batch', required: false, attributes: ['id', 'batchNumber'] },
      { association: 'fromLocation', required: false, attributes: ['id', 'name', 'code', 'aisle', 'rack', 'shelf', 'bin'] },
      { association: 'toLocation', required: false, attributes: ['id', 'name', 'code', 'aisle', 'rack', 'shelf', 'bin'] },
      { association: 'createdByUser', required: false, attributes: ['id', 'name', 'email'] },
    ],
  });
  return list.map((m) => {
    const j = m.toJSON();
    j.user = j.createdByUser;
    delete j.createdByUser;
    return j;
  });
}

async function createMovement(data, reqUser) {
  if (reqUser.role !== 'super_admin' && reqUser.role !== 'company_admin' && reqUser.role !== 'inventory_manager' && reqUser.role !== 'warehouse_manager') {
    throw new Error('Not allowed to create movement');
  }
  const companyId = reqUser.companyId || data.companyId;
  if (!companyId) throw new Error('Company context required');
  const product = await Product.findByPk(data.productId);
  if (!product) throw new Error('Product not found');
  if (product.companyId !== companyId && reqUser.role !== 'super_admin') throw new Error('Product not found');
  const movement = await Movement.create({
    companyId,
    type: data.type || 'TRANSFER',
    productId: data.productId,
    batchId: data.batchId || null,
    fromLocationId: data.fromLocationId || null,
    toLocationId: data.toLocationId || null,
    quantity: parseInt(data.quantity, 10) || 0,
    reason: data.reason || null,
    notes: data.notes || null,
    createdBy: reqUser.id,
  });
  return getMovementById(movement.id, reqUser);
}

async function getMovementById(id, reqUser) {
  const movement = await Movement.findByPk(id, {
    include: [
      { association: 'Product', attributes: ['id', 'name', 'sku'] },
      { association: 'Batch', required: false, attributes: ['id', 'batchNumber'] },
      { association: 'fromLocation', required: false, attributes: ['id', 'name', 'code', 'aisle', 'rack', 'shelf', 'bin'] },
      { association: 'toLocation', required: false, attributes: ['id', 'name', 'code', 'aisle', 'rack', 'shelf', 'bin'] },
      { association: 'createdByUser', required: false, attributes: ['id', 'name', 'email'] },
    ],
  });
  if (!movement) throw new Error('Movement not found');
  if (reqUser.role !== 'super_admin' && movement.companyId !== reqUser.companyId) throw new Error('Movement not found');
  const j = movement.toJSON();
  j.user = j.createdByUser;
  delete j.createdByUser;
  return j;
}

async function updateMovement(id, data, reqUser) {
  const movement = await Movement.findByPk(id);
  if (!movement) throw new Error('Movement not found');
  if (reqUser.role !== 'super_admin' && movement.companyId !== reqUser.companyId) throw new Error('Movement not found');
  await movement.update({
    type: data.type !== undefined ? data.type : movement.type,
    batchId: data.batchId !== undefined ? data.batchId : movement.batchId,
    fromLocationId: data.fromLocationId !== undefined ? data.fromLocationId : movement.fromLocationId,
    toLocationId: data.toLocationId !== undefined ? data.toLocationId : movement.toLocationId,
    quantity: data.quantity !== undefined ? parseInt(data.quantity, 10) : movement.quantity,
    reason: data.reason !== undefined ? data.reason : movement.reason,
    notes: data.notes !== undefined ? data.notes : movement.notes,
  });
  return getMovementById(movement.id, reqUser);
}

async function removeMovement(id, reqUser) {
  const movement = await Movement.findByPk(id);
  if (!movement) throw new Error('Movement not found');
  if (reqUser.role !== 'super_admin' && movement.companyId !== reqUser.companyId) throw new Error('Movement not found');
  await movement.destroy();
  return { message: 'Movement deleted' };
}

module.exports = {
  listProducts,
  listCategories,
  getProductById,
  createProduct,
  bulkCreateProducts,
  updateProduct,
  removeProduct,
  createCategory,
  updateCategory,
  removeCategory,
  listStock,
  createStock,
  updateStock,
  removeStock,
  listStockByBestBeforeDate,
  listStockByLocation,
  listAdjustments,
  createAdjustment,
  listCycleCounts,
  createCycleCount,
  listBatches,
  createBatch,
  getBatchById,
  updateBatch,
  removeBatch,
  listMovements,
  createMovement,
  getMovementById,
  updateMovement,
  removeMovement,
};
