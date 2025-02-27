const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EventType = sequelize.define('EventType', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      defaultValue: 'low',
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
    tableName: 'event_types',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['name'], name: 'idx_event_type_name' },
      { fields: ['priority'], name: 'idx_event_type_priority' },
    ],
  });

  // Add associations
  EventType.associate = (models) => {
    EventType.hasMany(models.Event, { foreignKey: 'event_type_id', as: 'events' });
  };

  return EventType;
};
