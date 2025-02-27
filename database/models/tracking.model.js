const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tracking = sequelize.define('Tracking', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    device_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    trip_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'trips',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    protocol_id: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    // sequential_count: {
    //   type: DataTypes.BIGINT,
    //   allowNull: false,
    // },
    date_from_device: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    date_from_server: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: false,
    },
    // location_type: {
    //   type: DataTypes.ENUM('accurate', 'approximate'),
    //   defaultValue: 'accurate',
    // },
    // longitude_appox: {
    //   type: DataTypes.DECIMAL(9, 6),
    // },
    // latitude_appox: {
    //   type: DataTypes.DECIMAL(9, 6),
    // },
    speed: {
      type: DataTypes.DECIMAL(10, 2),
    },
    orientation: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // alert: {
    //   type: DataTypes.INTEGER,
    //   allowNull: true,
    // },
    device_status: {
        type: DataTypes.ENUM('stopped', 'running', 'idle', 'offline'),
        defaultValue: 'stopped'
    },
    extras: {
      type: DataTypes.JSON,
    },
  }, {
    tableName: 'trackings',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['trip_id'], name: 'idx_tracking_trip_id' },
      { fields: ['date_from_device'], name: 'idx_tracking_date_from_device' },
      { fields: ['longitude', 'latitude'], name: 'idx_tracking_coordinates' },
    ],
  });

  return Tracking;
};
