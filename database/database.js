const { Sequelize } = require('sequelize');
const { Debug } = require('../utils/debug');
const fs = require('fs');
const path = require('path');
const conn =  new Sequelize(process.env.DATABASE_NAME, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD || null, {
    host: process.env.DATABASE_HOST,
    dialect: process.env.DATABASE_DRIVER,
    logging: (args) => false
});

conn.authenticate()
    .then(() => Debug.log('------ Connected with database -----'))
    .catch(err => Debug.log("Failed to connect with database: ", err));

const models = {};
const modelsPath = path.join(__dirname, 'models');

fs.readdirSync(modelsPath, {withFileTypes: true})
    .filter((file) => !file.isDirectory() && file.name.endsWith('.model.js'))
    .forEach(file => {
        const model = require(path.join(modelsPath, file.name))(conn);
        models[model.name] = model;
    });

// Establish associations
Object.values(models).forEach((model) => {
    if (model.associate) {
        model.associate(models); // Call the associate function in each model file
    }
});

conn.sync().then(() => {
    Debug.log("----- Schema Refreshed -----");
    
    // Import fixtures
    const seedersPath = path.join(__dirname, 'seeders');
    if (fs.existsSync(seedersPath)) {
        fs.readdirSync(seedersPath, {withFileTypes: true})
            .filter(file => !file.isDirectory() && file.name.endsWith('.fixture.js'))
            .forEach(async file => {
                try {
                    const seeder = require(path.join(seedersPath, file.name));
                    await seeder(models);
                    Debug.log(`Successfully seeded: ${file.name}`);
                } catch (err) {
                    Debug.log(`Error seeding ${file.name}:`, err);
                }
            });
    }
}).catch(err => Debug.log('Fail to refresh the database schema', err));

module.exports = { conn, models };