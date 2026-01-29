const express = require('express');
const router = express.Router();
const inventoryController = require('../../controllers/inventoryController');
const { authenticate, requireRole } = require('../../middlewares/auth');

router.use(authenticate);

router.get('/products', requireRole('super_admin', 'company_admin', 'inventory_manager', 'viewer'), inventoryController.listProducts);
router.get('/products/:id', requireRole('super_admin', 'company_admin', 'inventory_manager', 'viewer'), inventoryController.getProduct);
router.post('/products', requireRole('super_admin', 'company_admin', 'inventory_manager'), inventoryController.createProduct);
router.put('/products/:id', requireRole('super_admin', 'company_admin', 'inventory_manager'), inventoryController.updateProduct);

router.get('/categories', requireRole('super_admin', 'company_admin', 'inventory_manager', 'viewer'), inventoryController.listCategories);
router.post('/categories', requireRole('super_admin', 'company_admin', 'inventory_manager'), inventoryController.createCategory);
router.put('/categories/:id', requireRole('super_admin', 'company_admin', 'inventory_manager'), inventoryController.updateCategory);
router.delete('/categories/:id', requireRole('super_admin', 'company_admin', 'inventory_manager'), inventoryController.removeCategory);

router.get('/stock', requireRole('super_admin', 'company_admin', 'inventory_manager', 'viewer'), inventoryController.listStock);
router.post('/stock', requireRole('super_admin', 'company_admin', 'inventory_manager'), inventoryController.createStock);
router.put('/stock/:id', requireRole('super_admin', 'company_admin', 'inventory_manager'), inventoryController.updateStock);

module.exports = router;
