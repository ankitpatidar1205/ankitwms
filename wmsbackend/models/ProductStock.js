const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProductStock = sequelize.define('ProductStock', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  warehouseId: { type: DataTypes.INTEGER, allowNull: false },
  locationId: { type: DataTypes.INTEGER, allowNull: true },
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  reserved: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'product_stocks',
  timestamps: true,
  underscored: true,
});

module.exports = ProductStock;
