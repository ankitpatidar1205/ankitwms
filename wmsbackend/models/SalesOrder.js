const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SalesOrder = sequelize.define('SalesOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  companyId: { type: DataTypes.INTEGER, allowNull: false },
  orderNumber: { type: DataTypes.STRING, allowNull: false },
  customerId: { type: DataTypes.INTEGER, allowNull: true },
  orderDate: { type: DataTypes.DATEONLY, allowNull: true },
  requiredDate: { type: DataTypes.DATEONLY, allowNull: true },
  priority: { type: DataTypes.STRING, defaultValue: 'MEDIUM' },
  salesChannel: { type: DataTypes.STRING, defaultValue: 'DIRECT' },
  orderType: { type: DataTypes.STRING, allowNull: true },
  referenceNumber: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    validate: { isIn: [['pending', 'pick_list_created', 'picking', 'packing', 'packed', 'shipped']] },
  },
  totalAmount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'sales_orders',
  timestamps: true,
  underscored: true,
});

module.exports = SalesOrder;
