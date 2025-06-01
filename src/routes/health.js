const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const redis = require('../config/redis');

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
    try {
        const healthCheck = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
            services: {
                mongodb: 'checking',
                redis: 'checking',
                whisper: 'checking'
            }
        };

        // Check MongoDB
        try {
            if (mongoose.connection.readyState === 1) {
                await mongoose.connection.db.admin().ping();
                healthCheck.services.mongodb = 'healthy';
            } else {
                healthCheck.services.mongodb = 'unhealthy';
                healthCheck.status = 'degraded';
            }
        } catch (error) {
            healthCheck.services.mongodb = 'unhealthy';
            healthCheck.status = 'degraded';
        }

        // Check Redis
        try {
            await redis.ping();
            healthCheck.services.redis = 'healthy';
        } catch (error) {
            healthCheck.services.redis = 'unhealthy';
            healthCheck.status = 'degraded';
        }

        // Check Whisper model
        try {
            const whisperService = require('../services/WhisperService');
            if (whisperService.isModelLoaded()) {
                healthCheck.services.whisper = 'healthy';
            } else {
                healthCheck.services.whisper = 'loading';
                healthCheck.status = 'degraded';
            }
        } catch (error) {
            healthCheck.services.whisper = 'unhealthy';
            healthCheck.status = 'degraded';
        }

        // Return appropriate status code
        const statusCode = healthCheck.status === 'ok' ? 200 : 503;
        res.status(statusCode).json(healthCheck);

    } catch (error) {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * Liveness probe - simple check if the service is alive
 */
router.get('/health/live', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString()
    });
});

/**
 * Readiness probe - check if the service is ready to accept requests
 */
router.get('/health/ready', async (req, res) => {
    try {
        // Check if all critical services are ready
        const isMongoReady = mongoose.connection.readyState === 1;
        const isRedisReady = await redis.ping().then(() => true).catch(() => false);
        
        if (isMongoReady && isRedisReady) {
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                services: {
                    mongodb: isMongoReady ? 'ready' : 'not ready',
                    redis: isRedisReady ? 'ready' : 'not ready'
                }
            });
        }
    } catch (error) {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

module.exports = router;