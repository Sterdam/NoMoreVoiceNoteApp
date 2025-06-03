require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');

// Services et configurations
const { connectDB } = require('./config/database');
const { setupRedis } = require('./config/redis');
const LogService = require('./services/LogService');
const { doubleCsrfProtection, generateCSRFToken, validateCSRF, getCSRFToken } = require('./middlewares/csrf');
const performanceOptimizer = require('./utils/performanceOptimizer');
const { apiLimiter } = require('./middlewares/rateLimit');
const { addLegalHeaders, checkGDPRCompliance, checkExportCompliance } = require('./middlewares/legal');
const languageMiddleware = require('./middlewares/language');
const i18n = require('./config/i18n');
const { setupNotificationJobs } = require('./jobs/notificationJob');

// Import des routes
const authRoutes = require('./routes/auth');
const transcriptRoutes = require('./routes/transcripts');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payment');
const healthRoutes = require('./routes/health');
const legalRoutes = require('./routes/legal');

// Création de l'application
const app = express();
const httpServer = createServer(app);

// Configuration de base de l'application
const configureApp = () => {
    // Appliquer toutes les optimisations de performance
    performanceOptimizer.applyAll(app);
    
    // Configuration de la sécurité supplémentaire pour Stripe
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
                frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "blob:", "https://*.stripe.com"],
                connectSrc: ["'self'", "https://api.stripe.com", "wss:"],
                mediaSrc: ["'self'", "blob:"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));

    // CORS configuration
    const corsOrigins = process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL] 
        : ['http://localhost:5173', 'http://127.0.0.1:5173'];

    app.use(cors({
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-CSRF-Token'],
        exposedHeaders: ['Set-Cookie'],
        maxAge: 86400
    }));

    // Webhook Stripe doit être AVANT les parsers JSON
    app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

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

    // Protection CSRF uniquement en production
    if (process.env.NODE_ENV === 'production') {
        app.use(doubleCsrfProtection);
        app.use(validateCSRF);
    }
    
    // Legal compliance and export control (désactivé temporairement en développement)
    if (process.env.NODE_ENV !== 'development') {
        app.use(addLegalHeaders);
        app.use(checkGDPRCompliance);
        app.use(checkExportCompliance);
    } else {
        // Headers légaux basiques en développement
        app.use((req, res, next) => {
            res.setHeader('X-Legal-Notice', 'Development mode - full legal compliance disabled');
            next();
        });
    }
    
    // Rate limiting global pour l'API (désactivé en développement pour éviter les erreurs Redis)
    if (process.env.NODE_ENV !== 'development') {
        app.use('/api/', apiLimiter);
    }
    
    // Language middleware
    app.use(i18n.init);
    app.use(languageMiddleware);
    
    // Headers de sécurité supplémentaires
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        next();
    });

    // Fichiers statiques avec options optimisées
    app.use(express.static(path.join(__dirname, 'public'), performanceOptimizer.getStaticFileOptions()));

    // CSRF token endpoint (before other routes)
    app.get('/api/csrf-token', getCSRFToken);
    
    // Routes API
    app.use('/api/auth', authRoutes);
    app.use('/api/transcripts', transcriptRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/payment', paymentRoutes);
    app.use('/api/legal', legalRoutes);
    
    // Health check routes (sans CSRF)
    app.use('/api', healthRoutes);

    // Route racine pour servir l'app React en production
    if (process.env.NODE_ENV === 'production') {
        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
    }


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

// Vérification des variables d'environnement requises
const checkRequiredEnvVars = () => {
    const required = [
        'MONGODB_URI',
        'REDIS_URL',
        'JWT_SECRET',
        'COOKIE_SECRET',
        'CRYPTO_KEY',
        'CSRF_SECRET',
        'OPENAI_API_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'STRIPE_BASIC_PRICE_ID',
        'STRIPE_PRO_PRICE_ID',
        'STRIPE_ENTERPRISE_PRICE_ID'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
    }
    
    // Vérifier aussi les valeurs de sécurité
    const securityChecks = [
        { key: 'JWT_SECRET', minLength: 32 },
        { key: 'COOKIE_SECRET', minLength: 32 },
        { key: 'CRYPTO_KEY', minLength: 64 },
        { key: 'CSRF_SECRET', minLength: 32 }
    ];
    
    securityChecks.forEach(({ key, minLength }) => {
        if (process.env[key] && process.env[key].length < minLength) {
            LogService.warn(`${key} semble trop court (minimum ${minLength} caractères recommandés)`);
        }
    });
};

// Initialisation du serveur
const startServer = async () => {
    try {
        LogService.info('🚀 Démarrage du serveur...');
        
        // Vérifier les variables d'environnement
        if (process.env.NODE_ENV === 'production') {
            checkRequiredEnvVars();
        }
        
        // Configuration de l'application
        configureApp();
        
        // Connexion à la base de données avec options optimisées
        await connectDB(performanceOptimizer.getMongooseOptions());
        LogService.info('✅ Base de données connectée');

        // Initialisation de Redis
        await setupRedis();
        LogService.info('✅ Redis configuré');

        // Créer les index de base de données
        const initDB = require('./utils/dbInit');
        await initDB.initializeDatabase();
        LogService.info('✅ Base de données initialisée');

        // Démarrage du serveur HTTP
        const PORT = process.env.PORT || 3000;
        const HOST = process.env.HOST || '0.0.0.0';

        httpServer.listen(PORT, HOST, () => {
            LogService.info(`
╔═══════════════════════════════════════════╗
║   🚀 VoxKill Server Started!              ║
╠═══════════════════════════════════════════╣
║   📍 Address: ${HOST}:${PORT}             ║
║   🌍 Environment: ${process.env.NODE_ENV}  ║
║   📊 Version: 3.0.0                       ║
║   🔒 Security: Enhanced                   ║
║   ⚡ Performance: Optimized               ║
╚═══════════════════════════════════════════╝
            `);
            
            // Démarrer les jobs de notification
            setupNotificationJobs();
        });

    } catch (error) {
        LogService.error('❌ Échec du démarrage du serveur:', {
            error: error.message,
            stack: error.stack
        });
        console.error('Erreur complète:', error);
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
const gracefulShutdown = async (signal) => {
    LogService.info(`Signal ${signal} reçu. Arrêt gracieux...`);
    
    httpServer.close(async () => {
        try {
            // Fermer les connexions WhatsApp
            const WhatsAppService = require('./services/WhatsAppService');
            for (const [userId, client] of WhatsAppService.clients) {
                await WhatsAppService.logout(userId);
            }
            
            // Fermer le service de queue
            const QueueService = require('./services/QueueService');
            await QueueService.gracefulShutdown();
            
            // Fermer les connexions base de données
            const mongoose = require('mongoose');
            await mongoose.connection.close();
            
            // Fermer Redis
            const { getRedisClient } = require('./config/redis');
            const redis = getRedisClient();
            if (redis) await redis.quit();
            
            LogService.info('✅ Serveur arrêté proprement');
            process.exit(0);
        } catch (error) {
            LogService.error('Erreur lors de l\'arrêt:', error);
            process.exit(1);
        }
    });
    
    // Forcer l'arrêt après 30 secondes
    setTimeout(() => {
        LogService.warn('Délai d\'arrêt dépassé, arrêt forcé');
        process.exit(0);
    }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Démarrage de l'application
startServer();