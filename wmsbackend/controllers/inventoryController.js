const inventoryService = require('../services/inventoryService');

async function listProducts(req, res, next) {
  try {
    const data = await inventoryService.listProducts(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const data = await inventoryService.getProductById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Product not found') return res.status(404).json({ success: false, message: err.message });
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const data = await inventoryService.createProduct(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.message === 'SKU already exists for this company') return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const data = await inventoryService.updateProduct(req.params.id, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Product not found') return res.status(404).json({ success: false, message: err.message });
    next(err);
  }
}

async function listCategories(req, res, next) {
  try {
    const data = await inventoryService.listCategories(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const data = await inventoryService.createCategory(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.message?.includes('companyId') || err.message?.includes('Category code')) return res.status(400).json({ success: false, message: err.message });
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const data = await inventoryService.updateCategory(req.params.id, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Category not found') return res.status(404).json({ success: false, message: err.message });
    next(err);
  }
}

async function removeCategory(req, res, next) {
  try {
    await inventoryService.removeCategory(req.params.id, req.user);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    if (err.message === 'Category not found') return res.status(404).json({ success: false, message: err.message });
    next(err);
  }
}

async function listStock(req, res, next) {
  try {
    const data = await inventoryService.listStock(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createStock(req, res, next) {
  try {
    const data = await inventoryService.createStock(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.message === 'Product not found') return res.status(404).json({ success: false, message: err.message });
    next(err);
  }
}

async function updateStock(req, res, next) {
  try {
    const data = await inventoryService.updateStock(req.params.id, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === 'Stock not found') return res.status(404).json({ success: false, message: err.message });
    next(err);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  listCategories,
  createCategory,
  updateCategory,
  removeCategory,
  listStock,
  createStock,
  updateStock,
};
