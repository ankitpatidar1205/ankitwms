const { Product, Category, ProductStock, Warehouse, Company, Supplier } = require('../models');
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
  });
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
  };
  await product.update(upd);
  return product;
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
  });
  return stock;
}

module.exports = {
  listProducts,
  listCategories,
  getProductById,
  createProduct,
  updateProduct,
  createCategory,
  updateCategory,
  removeCategory,
  listStock,
  createStock,
  updateStock,
};
