const { sequelize } = require('../config/db');
const User = require('./User');
const Company = require('./Company');
const Warehouse = require('./Warehouse');
const Zone = require('./Zone');
const Location = require('./Location');
const Category = require('./Category');
const Product = require('./Product');
const ProductStock = require('./ProductStock');
const Bundle = require('./Bundle');
const BundleItem = require('./BundleItem');
const Customer = require('./Customer');
const Supplier = require('./Supplier');
const SalesOrder = require('./SalesOrder');
const OrderItem = require('./OrderItem');
const PickList = require('./PickList');
const PickListItem = require('./PickListItem');
const PackingTask = require('./PackingTask');
const Shipment = require('./Shipment');
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const GoodsReceipt = require('./GoodsReceipt');
const GoodsReceiptItem = require('./GoodsReceiptItem');
const InventoryAdjustment = require('./InventoryAdjustment');
const CycleCount = require('./CycleCount');
const Batch = require('./Batch');
const Movement = require('./Movement');
const ReplenishmentTask = require('./ReplenishmentTask');
const ReplenishmentConfig = require('./ReplenishmentConfig');
const Report = require('./Report');
const Return = require('./Return');

// Company
Company.hasMany(User, { foreignKey: 'companyId' });
User.belongsTo(Company, { foreignKey: 'companyId' });

// User -> Warehouse (staff can be assigned to a warehouse)
Warehouse.hasMany(User, { foreignKey: 'warehouseId' });
User.belongsTo(Warehouse, { foreignKey: 'warehouseId' });

// Returns
Company.hasMany(Return, { foreignKey: 'companyId' });
Return.belongsTo(Company, { foreignKey: 'companyId' });
SalesOrder.hasMany(Return, { foreignKey: 'salesOrderId' });
Return.belongsTo(SalesOrder, { foreignKey: 'salesOrderId' });
Shipment.hasMany(Return, { foreignKey: 'shipmentId' });
Return.belongsTo(Shipment, { foreignKey: 'shipmentId' });
Customer.hasMany(Return, { foreignKey: 'customerId' });
Return.belongsTo(Customer, { foreignKey: 'customerId' });

module.exports = {
  sequelize,
  User,
  Company,
  Warehouse,
  Zone,
  Location,
  Category,
  Product,
  ProductStock,
  Bundle,
  BundleItem,
  Customer,
  Supplier,
  SalesOrder,
  OrderItem,
  PickList,
  PickListItem,
  PackingTask,
  Shipment,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  InventoryAdjustment,
  CycleCount,
  Batch,
  Movement,
  ReplenishmentTask,
  ReplenishmentConfig,
  Report,
  Return,
};


module.exports = {
  sequelize,
  User,
  Company,
  Warehouse,
  Zone,
  Location,
  Category,
  Product,
  ProductStock,
  Bundle,
  BundleItem,
  Customer,
  Supplier,
  SalesOrder,
  OrderItem,
  PickList,
  PickListItem,
  PackingTask,
  Shipment,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  InventoryAdjustment,
  CycleCount,
  Batch,
  Movement,
  ReplenishmentTask,
  ReplenishmentConfig,
  Report,
};
