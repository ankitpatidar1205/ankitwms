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

// Company
Company.hasMany(User, { foreignKey: 'companyId' });
User.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Warehouse, { foreignKey: 'companyId' });
Warehouse.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Category, { foreignKey: 'companyId' });
Category.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Product, { foreignKey: 'companyId' });
Product.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Customer, { foreignKey: 'companyId' });
Customer.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Supplier, { foreignKey: 'companyId' });
Supplier.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(SalesOrder, { foreignKey: 'companyId' });
SalesOrder.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Shipment, { foreignKey: 'companyId' });
Shipment.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(PurchaseOrder, { foreignKey: 'companyId' });
PurchaseOrder.belongsTo(Company, { foreignKey: 'companyId' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplierId' });
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplierId' });
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchaseOrderId' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId' });
PurchaseOrderItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(PurchaseOrderItem, { foreignKey: 'productId' });

// GoodsReceipt
Company.hasMany(GoodsReceipt, { foreignKey: 'companyId' });
GoodsReceipt.belongsTo(Company, { foreignKey: 'companyId' });
GoodsReceipt.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId' });
PurchaseOrder.hasMany(GoodsReceipt, { foreignKey: 'purchaseOrderId' });
GoodsReceipt.hasMany(GoodsReceiptItem, { foreignKey: 'goodsReceiptId' });
GoodsReceiptItem.belongsTo(GoodsReceipt, { foreignKey: 'goodsReceiptId' });
GoodsReceiptItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(GoodsReceiptItem, { foreignKey: 'productId' });

// User
User.belongsTo(Warehouse, { foreignKey: 'warehouseId' });
Warehouse.hasMany(User, { foreignKey: 'warehouseId' });

// Warehouse
Warehouse.hasMany(Zone, { foreignKey: 'warehouseId' });
Zone.belongsTo(Warehouse, { foreignKey: 'warehouseId' });
Warehouse.hasMany(PickList, { foreignKey: 'warehouseId' });
PickList.belongsTo(Warehouse, { foreignKey: 'warehouseId' });
Warehouse.hasMany(ProductStock, { foreignKey: 'warehouseId' });
ProductStock.belongsTo(Warehouse, { foreignKey: 'warehouseId' });

// Zone / Location
Zone.hasMany(Location, { foreignKey: 'zoneId' });
Location.belongsTo(Zone, { foreignKey: 'zoneId' });
ProductStock.belongsTo(Location, { foreignKey: 'locationId' });
Location.hasMany(ProductStock, { foreignKey: 'locationId' });

// Category / Product
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });
Product.belongsTo(Supplier, { foreignKey: 'supplierId' });
Supplier.hasMany(Product, { foreignKey: 'supplierId' });
Product.hasMany(ProductStock, { foreignKey: 'productId' });
ProductStock.belongsTo(Product, { foreignKey: 'productId' });

// Bundle
Company.hasMany(Bundle, { foreignKey: 'companyId' });
Bundle.belongsTo(Company, { foreignKey: 'companyId' });
Bundle.hasMany(BundleItem, { foreignKey: 'bundleId' });
BundleItem.belongsTo(Bundle, { foreignKey: 'bundleId' });
BundleItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(BundleItem, { foreignKey: 'productId' });

// SalesOrder
SalesOrder.belongsTo(Customer, { foreignKey: 'customerId' });
Customer.hasMany(SalesOrder, { foreignKey: 'customerId' });
SalesOrder.belongsTo(User, { foreignKey: 'createdBy' });
SalesOrder.hasMany(OrderItem, { foreignKey: 'salesOrderId' });
OrderItem.belongsTo(SalesOrder, { foreignKey: 'salesOrderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(OrderItem, { foreignKey: 'productId' });

SalesOrder.hasMany(PickList, { foreignKey: 'salesOrderId' });
PickList.belongsTo(SalesOrder, { foreignKey: 'salesOrderId' });
PickList.belongsTo(User, { foreignKey: 'assignedTo' });
User.hasMany(PickList, { foreignKey: 'assignedTo' });
PickList.hasMany(PickListItem, { foreignKey: 'pickListId' });
PickListItem.belongsTo(PickList, { foreignKey: 'pickListId' });
PickListItem.belongsTo(Product, { foreignKey: 'productId' });

SalesOrder.hasMany(PackingTask, { foreignKey: 'salesOrderId' });
PackingTask.belongsTo(SalesOrder, { foreignKey: 'salesOrderId' });
PackingTask.belongsTo(PickList, { foreignKey: 'pickListId' });
PackingTask.belongsTo(User, { foreignKey: 'assignedTo' });
User.hasMany(PackingTask, { foreignKey: 'assignedTo' });

SalesOrder.hasOne(Shipment, { foreignKey: 'salesOrderId' });
Shipment.belongsTo(SalesOrder, { foreignKey: 'salesOrderId' });
Shipment.belongsTo(User, { foreignKey: 'packedBy' });

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
};
