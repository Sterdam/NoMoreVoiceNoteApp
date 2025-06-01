const mongoose = require('mongoose');
const LogService = require('../services/LogService');

const connectDB = async (additionalOptions = {}) => {
    try {
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            heartbeatFrequencyMS: 2000,
            socketTimeoutMS: 45000,
            directConnection: true,
            retryWrites: true,
            retryReads: true,
            ...additionalOptions // Fusionner avec les options du performanceOptimizer
        };

        const mongoURI = process.env.MONGODB_URI;
        LogService.info('Tentative de connexion à MongoDB...', {
            uri: mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@' )
        });

        mongoose.connection.on('error', (err) => {
            LogService.error('Erreur MongoDB:', {
                error: err.message,
                stack: err.stack
            });
        });

        mongoose.connection.on('disconnected', () => {
            LogService.warn('Déconnecté de MongoDB, tentative de reconnexion...');
            setTimeout(reconnectDB, 5000);
        });

        mongoose.connection.on('connected', () => {
            LogService.info('Connexion MongoDB établie');
        });

        const conn = await mongoose.connect(mongoURI, options);
        LogService.info('✅ Connexion MongoDB établie');

        return mongoose.connection;

    } catch (error) {
        LogService.error('Erreur de connexion à MongoDB:', {
            error: error.message,
            stack: error.stack
        });
        setTimeout(reconnectDB, 5000);
        throw error;
    }
};

const reconnectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        LogService.info('Déjà connecté à MongoDB');
        return;
    }

    try {
        await mongoose.connection.close();
        await connectDB();
        LogService.info('✅ Reconnexion à MongoDB réussie');
    } catch (error) {
        LogService.error('Erreur lors de la reconnexion:', {
            error: error.message,
            stack: error.stack
        });
        setTimeout(reconnectDB, 5000);
    }
};

module.exports = { connectDB };