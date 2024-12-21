// src/middlewares/rateLimit.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');
const LogService = require('../services/LogService');

const createRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes par défaut
        max = 100, // 100 requêtes par fenêtre par défaut
        message = 'Trop de requêtes, veuillez réessayer plus tard.',
        keyPrefix = 'rl'
    } = options;

    return rateLimit({
        store: new RedisStore({
            sendCommand: (...args) => getRedisClient().sendCommand(args),
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
            res.status(429).json(options.message);
        },
        keyGenerator: (req) => {
            // Utilise l'ID utilisateur si disponible, sinon l'IP
            return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
        }
    });
};

// Limiteurs spécifiques
const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
    keyPrefix: 'rl:auth'
});

const apiLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requêtes
    message: 'Trop de requêtes API, veuillez réessayer dans une minute.',
    keyPrefix: 'rl:api'
});

const transcriptionLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 30, // 30 transcriptions
    message: 'Limite de transcriptions atteinte, veuillez réessayer dans une heure.',
    keyPrefix: 'rl:transcription'
});

module.exports = {
    authLimiter,
    apiLimiter,
    transcriptionLimiter
};