const env = process.env.NODE_ENV || 'development';

const config = {
    development: {
        app: {
            port: process.env.PORT || 3000,
            host: process.env.HOST || 'localhost',
            baseUrl: 'http://localhost:3000'
        },
        db: {
            uri: process.env.MONGODB_URI || 'mongodb://whatsapp_user:whatsapp_password@mongodb:27017/whatsapp-transcriber?authSource=admin',
        },
        redis: {
            url: process.env.REDIS_URL || 'redis://:redis123@redis:6379'
        },
        jwt: {
            secret: process.env.JWT_SECRET || 'your-dev-secret-key',
            expiresIn: '24h'
        },
        cors: {
            origin: ['http://localhost:3000'],
            credentials: true
        },
        whisper: {
            model: process.env.WHISPER_MODEL || 'base',
            modelsPath: '/app/models',
            tempPath: '/app/temp'
        }
    },
    production: {
        app: {
            port: process.env.PORT || 3000,
            host: process.env.HOST || '0.0.0.0',
            baseUrl: process.env.BASE_URL || 'https://your-domain.com'
        },
        db: {
            uri: process.env.MONGODB_URI
        },
        redis: {
            url: process.env.REDIS_URL
        },
        jwt: {
            secret: process.env.JWT_SECRET,
            expiresIn: '24h'
        },
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [],
            credentials: true
        },
        whisper: {
            model: process.env.WHISPER_MODEL || 'base',
            modelsPath: '/app/models',
            tempPath: '/app/temp'
        }
    }
};

// Vérification de la configuration requise en production
if (env === 'production') {
    const requiredEnvVars = [
        'MONGODB_URI',
        'REDIS_URL',
        'JWT_SECRET',
        'BASE_URL',
        'CORS_ORIGIN'
    ];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Environment variable ${envVar} is required in production`);
        }
    }
}

module.exports = config[env];