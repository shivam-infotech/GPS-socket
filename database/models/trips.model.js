const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Trip = sequelize.define('Trip', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    device_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    starts_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ends_at: {
      type: DataTypes.DATE,
    },
    start_address: {
      type: DataTypes.TEXT,
    },
    end_address: {
      type: DataTypes.TEXT,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      onUpdate: DataTypes.NOW,
    },
  }, {
    tableName: 'trips',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['device_id'], name: 'idx_device_id' },
      { fields: ['starts_at'], name: 'idx_starts_at' },
    ],
  });

  return Trip;
};
