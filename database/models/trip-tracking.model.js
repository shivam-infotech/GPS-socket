const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TripTracking = sequelize.define('TripTracking', {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        trip_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'trips',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        tracking_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'trackings',
                key: 'id',
            }
        },
    }, {
        tableName: 'trip_tracking',
        timestamps: false,
    });

    // Relationships
    TripTracking.associate = (models) => {
        TripTracking.belongsTo(models.Trip, { foreignKey: 'trip_id', as: 'trip' });
    };

    // Relationships
    TripTracking.associate = (models) => {
        TripTracking.hasMany(models.Tracking, { foreignKey: 'tracking_id', as: 'trackings' });
    };

    return TripTracking;
};
