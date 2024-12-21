require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const winston = require('winston');
require('winston-daily-rotate-file');

// Services et configurations
const { connectDB } = require('./config/database');
const { setupRedis } = require('./config/redis');
const { initializeWhisper } = require('./config/whisperInit');
const LogService = require('./services/LogService');

// Import des routes
const authRoutes = require('./routes/auth');
const transcriptRoutes = require('./routes/transcripts');
const userRoutes = require('./routes/users');

// Création de l'application
const app = express();
const httpServer = createServer(app);

// Configuration de base de l'application
const configureApp = () => {
    // Configuration de la sécurité
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'"]
            }
        }
    }));

    // Compression des réponses
    app.use(compression());

    app.use(cors({
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: ['Set-Cookie'],
        maxAge: 86400
    }));

    // Parsers
    app.use(express.json({
        limit: process.env.MAX_FILE_SIZE || '50mb',
        strict: true
    }));

    app.use(express.urlencoded({
        extended: true,
        limit: process.env.MAX_FILE_SIZE || '50mb'
    }));

    // Cookie parser avec secret
    app.use(cookieParser(process.env.COOKIE_SECRET || 'your-secret-key'));

    // Fichiers statiques
    app.use(express.static(path.join(__dirname, 'public')));

    // Routes API
    app.use('/api/auth', authRoutes);
    app.use('/api/transcripts', transcriptRoutes);
    app.use('/api/users', userRoutes);

    // Route racine pour servir index.html
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Route de santé
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV
        });
    });

    // Middleware pour les routes non trouvées
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
            res.status(404).json({ error: `Route API ${req.path} non trouvée` });
        } else {
            res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
        }
    });

    // Gestion globale des erreurs
    app.use((err, req, res, next) => {
        LogService.error('Erreur application:', {
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            ip: req.ip
        });

        // Ne pas exposer les détails de l'erreur en production
        const errorMessage = process.env.NODE_ENV === 'production'
            ? 'Une erreur interne est survenue'
            : err.message;

        if (req.path.startsWith('/api/')) {
            res.status(err.status || 500).json({ error: errorMessage });
        } else {
            res.status(err.status || 500).send(errorMessage);
        }
    });
};

// Initialisation du serveur
const startServer = async () => {
    try {
        LogService.info('Démarrage du serveur...');
        
        // Configuration de l'application
        configureApp();
        
        // Connexion à la base de données en premier
        await connectDB();
        LogService.info('✅ Base de données initialisée');

        // Initialisation de Redis
        await setupRedis();
        LogService.info('✅ Redis configuré');

        // Initialisation de Whisper
        await initializeWhisper();
        LogService.info('✅ Whisper initialisé');

        // Démarrage du serveur HTTP
        const PORT = process.env.PORT || 3000;
        const HOST = process.env.HOST || '0.0.0.0';

        httpServer.listen(PORT, HOST, () => {
            LogService.info(`🚀 Serveur démarré sur ${HOST}:${PORT}`);
            LogService.info(`📋 Environnement: ${process.env.NODE_ENV}`);
            LogService.info(`🌐 CORS autorisé pour: ${process.env.CORS_ORIGIN || 'localhost'}`);
        });

    } catch (error) {
        LogService.error('❌ Échec du démarrage du serveur:', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
};

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    LogService.error('Promesse rejetée non gérée:', {
        reason: reason,
        promise: promise
    });
});

process.on('uncaughtException', (error) => {
    LogService.error('Exception non capturée:', {
        message: error.message,
        stack: error.stack
    });
    // Arrêt gracieux
    httpServer.close(() => {
        LogService.info('Serveur arrêté suite à une exception non capturée');
        process.exit(1);
    });
    // Si la fermeture prend trop de temps, forcer l'arrêt
    setTimeout(() => {
        LogService.error('Arrêt forcé du serveur');
        process.exit(1);
    }, 10000);
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
    LogService.info('Signal SIGTERM reçu. Arrêt gracieux...');
    httpServer.close(() => {
        LogService.info('Serveur arrêté proprement');
        process.exit(0);
    });
    // Forcer l'arrêt après 30 secondes
    setTimeout(() => {
        LogService.warn('Délai d\'arrêt dépassé, arrêt forcé');
        process.exit(0);
    }, 30000);
});

// Démarrage de l'application
startServer();