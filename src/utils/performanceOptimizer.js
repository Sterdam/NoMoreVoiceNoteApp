// src/utils/performanceOptimizer.js
const compression = require('compression');
const helmet = require('helmet');
const LogService = require('../services/LogService');

class PerformanceOptimizer {
    constructor() {
        this.compressionOptions = {
            level: 6, // Niveau de compression (0-9)
            threshold: 1024, // Ne compresser que les réponses > 1KB
            filter: (req, res) => {
                // Ne pas compresser les streams et les EventSource
                if (req.headers['accept'] === 'text/event-stream') {
                    return false;
                }
                // Utiliser la compression par défaut pour le reste
                return compression.filter(req, res);
            }
        };

        this.cacheControl = {
            // Assets statiques (images, fonts, etc.)
            static: 'public, max-age=31536000, immutable', // 1 an
            
            // CSS et JS
            assets: 'public, max-age=2592000', // 30 jours
            
            // API responses
            api: 'private, no-cache, no-store, must-revalidate',
            
            // HTML
            html: 'private, no-cache',
            
            // Transcriptions (peuvent être mises en cache côté client)
            transcriptions: 'private, max-age=3600' // 1 heure
        };
    }

    // Middleware de compression
    getCompressionMiddleware() {
        return compression(this.compressionOptions);
    }

    // Middleware pour les headers de cache
    getCacheMiddleware() {
        return (req, res, next) => {
            // Déterminer le type de contenu
            const path = req.path.toLowerCase();
            
            if (path.match(/\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
                res.setHeader('Cache-Control', this.cacheControl.static);
            } else if (path.match(/\.(css|js)$/)) {
                res.setHeader('Cache-Control', this.cacheControl.assets);
            } else if (path.startsWith('/api/')) {
                res.setHeader('Cache-Control', this.cacheControl.api);
                
                // Cache spécifique pour les transcriptions
                if (path.includes('/transcripts/') && req.method === 'GET') {
                    res.setHeader('Cache-Control', this.cacheControl.transcriptions);
                }
            } else if (path.match(/\.html$/) || path === '/') {
                res.setHeader('Cache-Control', this.cacheControl.html);
            }
            
            // Headers de performance supplémentaires
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            
            next();
        };
    }

    // Optimisations de sécurité avec Helmet
    getSecurityHeaders() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                    imgSrc: ["'self'", "data:", "https:", "blob:"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    connectSrc: ["'self'", "wss:", "https:"],
                    mediaSrc: ["'self'", "blob:"],
                    objectSrc: ["'none'"],
                    frameSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    frameAncestors: ["'none'"],
                    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
                }
            },
            crossOriginEmbedderPolicy: false, // Pour permettre l'intégration d'images externes
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        });
    }

    // Middleware pour limiter la taille des requêtes
    getBodyParserOptions() {
        return {
            json: {
                limit: '10mb',
                strict: true,
                type: 'application/json'
            },
            urlencoded: {
                limit: '10mb',
                extended: true,
                parameterLimit: 1000
            }
        };
    }

    // Optimisations MongoDB
    getMongooseOptions() {
        return {
            // Pool de connexions
            maxPoolSize: 10,
            minPoolSize: 2,
            
            // Timeouts
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            
            // Optimisations de requêtes
            autoIndex: process.env.NODE_ENV !== 'production',
            
            // Compression
            compressors: ['zlib'],
            zlibCompressionLevel: 6
        };
    }

    // Configuration des workers pour la production
    getClusterConfig() {
        const os = require('os');
        const numCPUs = os.cpus().length;
        
        return {
            workers: process.env.NODE_ENV === 'production' ? numCPUs : 1,
            restartDelay: 1000,
            gracefulTimeout: 30000
        };
    }

    // Middleware de monitoring des performances
    getPerformanceMonitoring() {
        return (req, res, next) => {
            const start = process.hrtime.bigint();
            
            // Intercepter la fin de la réponse
            const originalEnd = res.end;
            res.end = function(...args) {
                const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convertir en ms
                
                // Logger les requêtes lentes
                if (duration > 1000) {
                    LogService.warn('Slow request detected:', {
                        method: req.method,
                        path: req.path,
                        duration: `${duration.toFixed(2)}ms`,
                        statusCode: res.statusCode,
                        userAgent: req.headers['user-agent']
                    });
                }
                
                // Ajouter un header de performance
                res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
                
                originalEnd.apply(res, args);
            };
            
            next();
        };
    }

    // Optimisations pour les fichiers statiques
    getStaticFileOptions() {
        return {
            maxAge: '1y',
            etag: true,
            lastModified: true,
            index: false,
            redirect: false,
            setHeaders: (res, path) => {
                if (path.endsWith('.html')) {
                    res.setHeader('Cache-Control', this.cacheControl.html);
                } else if (path.match(/\.(js|css)$/)) {
                    res.setHeader('Cache-Control', this.cacheControl.assets);
                }
            }
        };
    }

    // Configuration optimisée pour PM2
    getPM2Config() {
        return {
            apps: [{
                name: 'voxkill',
                script: './src/app.js',
                instances: 'max',
                exec_mode: 'cluster',
                watch: false,
                max_memory_restart: '1G',
                error_file: './logs/pm2-error.log',
                out_file: './logs/pm2-out.log',
                log_file: './logs/pm2-combined.log',
                time: true,
                env: {
                    NODE_ENV: 'production',
                    NODE_OPTIONS: '--max-old-space-size=1024'
                },
                // Optimisations de redémarrage
                min_uptime: '10s',
                max_restarts: 10,
                autorestart: true,
                restart_delay: 4000,
                // Monitoring
                pmx: true,
                instance_var: 'INSTANCE_ID',
                merge_logs: true,
                // Graceful shutdown
                kill_timeout: 5000,
                listen_timeout: 3000,
                shutdown_with_message: true
            }]
        };
    }

    // Nettoyage périodique des ressources
    setupResourceCleanup(interval = 3600000) { // 1 heure par défaut
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            
            LogService.info('Resource usage check:', {
                heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
                heapPercentage: `${heapPercentage.toFixed(2)}%`,
                rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
                external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`
            });
            
            // Forcer le garbage collection si disponible et nécessaire
            if (global.gc && heapPercentage > 80) {
                global.gc();
                LogService.info('Manual garbage collection triggered');
            }
        }, interval);
    }

    // Appliquer toutes les optimisations
    applyAll(app) {
        // Compression
        app.use(this.getCompressionMiddleware());
        
        // Sécurité
        app.use(this.getSecurityHeaders());
        
        // Cache
        app.use(this.getCacheMiddleware());
        
        // Monitoring
        app.use(this.getPerformanceMonitoring());
        
        // Nettoyage des ressources
        this.setupResourceCleanup();
        
        LogService.info('Performance optimizations applied');
    }
}

module.exports = new PerformanceOptimizer();