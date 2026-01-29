const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PackingTask = sequelize.define('PackingTask', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  salesOrderId: { type: DataTypes.INTEGER, allowNull: false },
  pickListId: { type: DataTypes.INTEGER, allowNull: true },
  assignedTo: { type: DataTypes.INTEGER, allowNull: true },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    validate: { isIn: [['pending', 'packing', 'completed']] },
  },
  packedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'packing_tasks',
  timestamps: true,
  underscored: true,
});

module.exports = PackingTask;
