// src/middlewares/rateLimit.js
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');
const LogService = require('../services/LogService');
const { t } = require('../utils/translate');

const createRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes par défaut
        max = 100, // 100 requêtes par fenêtre par défaut
        message = t('errors.tooManyRequests'),
        keyPrefix = 'rl'
    } = options;

    try {
        const redisClient = getRedisClient();
        return rateLimit({
            store: new RedisStore({
                client: redisClient,
                prefix: keyPrefix
            }),
            windowMs,
            max,
            message: { error: message },
            handler: (req, res) => {
                LogService.warn('Rate limit exceeded:', {
                    ip: req.ip,
                    path: req.path,
                    userId: req.user?.id
                });
                res.status(429).json({ error: t('errors.tooManyRequests', req) });
            },
            keyGenerator: (req) => {
                // Utilise l'ID utilisateur si disponible, sinon l'IP
                return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
            }
        });
    } catch (error) {
        LogService.error('Error initializing rate limiter:', error);
        // Retourne un middleware qui ne fait rien en cas d'erreur
        return (req, res, next) => next();
    }
};

// Créer les instances de rate limiter au moment de l'initialisation du module
const transcriptionLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 transcriptions par 15 minutes
    message: t('errors.tooManyTranscriptionRequests'),
    keyPrefix: 'rl:transcription'
});

const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives par 15 minutes
    message: t('errors.tooManyLoginAttempts'),
    keyPrefix: 'rl:auth'
});

const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requêtes API par 15 minutes
    message: t('errors.apiRateLimitReached'),
    keyPrefix: 'rl:api'
});

module.exports = {
    createRateLimiter,
    transcriptionLimiter,
    authLimiter,
    apiLimiter
};