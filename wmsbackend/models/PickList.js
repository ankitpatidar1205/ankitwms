const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PickList = sequelize.define('PickList', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  salesOrderId: { type: DataTypes.INTEGER, allowNull: false },
  warehouseId: { type: DataTypes.INTEGER, allowNull: false },
  assignedTo: { type: DataTypes.INTEGER, allowNull: true },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    validate: { isIn: [['pending', 'in_progress', 'completed']] },
  },
}, {
  tableName: 'pick_lists',
  timestamps: true,
  underscored: true,
});

module.exports = PickList;
