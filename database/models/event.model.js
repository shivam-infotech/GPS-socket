const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    event_type_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'event_types',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    device_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    tracking_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'trackings',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    date_from_device: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: 'events',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['event_type_id'], name: 'idx_event_event_type_id' },
      { fields: ['device_id'], name: 'idx_event_device_id' },
      { fields: ['date_from_device'], name: 'idx_event_date_from_device' },
      { fields: ['tracking_id'], name: 'idx_event_tracking_id' },
    ],
  });

  // Add associations
  Event.associate = (models) => {
    Event.belongsTo(models.EventType, { foreignKey: 'event_type_id', as: 'eventType' });
    Event.belongsTo(models.Tracking, { foreignKey: 'tracking_id', as: 'tracking' });
  };

  return Event;
};
