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

    // Retourner une fonction middleware qui initialise le rate limiter de manière différée
    let limiter = null;
    
    return (req, res, next) => {
        if (!limiter) {
            try {
                const redisClient = getRedisClient();
                limiter = rateLimit({
                    store: new RedisStore({
                        client: redisClient,
                        prefix: keyPrefix
                    }),
                    windowMs,
                    max,
                    message: { error: message },
                    handler: (req, res, next, options) => {
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
                // En cas d'erreur, continuer sans rate limiting
                return next();
            }
        }
        
        if (limiter) {
            limiter(req, res, next);
        } else {
            next();
        }
    };
};

// Rate limiters spécifiques - initialisés uniquement quand utilisés
const getTranscriptionLimiter = () => createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 transcriptions par 15 minutes
    message: t('errors.tooManyTranscriptionRequests'),
    keyPrefix: 'rl:transcription'
});

const getAuthLimiter = () => createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives par 15 minutes
    message: t('errors.tooManyLoginAttempts'),
    keyPrefix: 'rl:auth'
});

const getApiLimiter = () => createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requêtes API par 15 minutes
    message: t('errors.apiRateLimitReached'),
    keyPrefix: 'rl:api'
});

// Variables pour stocker les instances
let transcriptionLimiterInstance = null;
let authLimiterInstance = null;
let apiLimiterInstance = null;

// Getters qui créent l'instance une seule fois
const transcriptionLimiter = (req, res, next) => {
    if (!transcriptionLimiterInstance) {
        transcriptionLimiterInstance = getTranscriptionLimiter();
    }
    return transcriptionLimiterInstance(req, res, next);
};

const authLimiter = (req, res, next) => {
    if (!authLimiterInstance) {
        authLimiterInstance = getAuthLimiter();
    }
    return authLimiterInstance(req, res, next);
};

const apiLimiter = (req, res, next) => {
    if (!apiLimiterInstance) {
        apiLimiterInstance = getApiLimiter();
    }
    return apiLimiterInstance(req, res, next);
};

module.exports = {
    createRateLimiter,
    transcriptionLimiter,
    authLimiter,
    apiLimiter
};