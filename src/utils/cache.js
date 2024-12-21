// src/utils/cache.js
const NodeCache = require('node-cache');
const { getRedisClient } = require('../config/redis');
const LogService = require('../services/LogService');

class CacheManager {
    constructor() {
        // Cache local pour les données fréquemment accédées
        this.localCache = new NodeCache({
            stdTTL: 300, // 5 minutes
            checkperiod: 60,
            useClones: false
        });

        // Client Redis pour le cache distribué
        this.redis = getRedisClient();
    }

    // Cache local
    async getLocal(key) {
        return this.localCache.get(key);
    }

    async setLocal(key, value, ttl = 300) {
        return this.localCache.set(key, value, ttl);
    }

    async delLocal(key) {
        return this.localCache.del(key);
    }

    // Cache Redis
    async getRedis(key) {
        try {
            const value = await this.redis.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            LogService.error('Redis get error:', { key, error });
            return null;
        }
    }

    async setRedis(key, value, ttl = 3600) {
        try {
            const stringValue = JSON.stringify(value);
            await this.redis.set(key, stringValue, 'EX', ttl);
            return true;
        } catch (error) {
            LogService.error('Redis set error:', { key, error });
            return false;
        }
    }

    async delRedis(key) {
        try {
            await this.redis.del(key);
            return true;
        } catch (error) {
            LogService.error('Redis del error:', { key, error });
            return false;
        }
    }

    // Méthodes composées
    async get(key, options = {}) {
        const { useLocal = true, useRedis = true } = options;

        // Vérifier d'abord le cache local
        if (useLocal) {
            const localValue = await this.getLocal(key);
            if (localValue !== undefined) {
                return localValue;
            }
        }

        // Si pas trouvé en local et Redis activé, vérifier Redis
        if (useRedis) {
            const redisValue = await this.getRedis(key);
            if (redisValue !== null) {
                // Mettre en cache local si activé
                if (useLocal) {
                    await this.setLocal(key, redisValue);
                }
                return redisValue;
            }
        }

        return null;
    }

    async set(key, value, options = {}) {
        const { useLocal = true, useRedis = true, localTTL = 300, redisTTL = 3600 } = options;

        let success = true;

        if (useLocal) {
            success = success && await this.setLocal(key, value, localTTL);
        }

        if (useRedis) {
            success = success && await this.setRedis(key, value, redisTTL);
        }

        return success;
    }

    async del(key, options = {}) {
        const { useLocal = true, useRedis = true } = options;

        let success = true;

        if (useLocal) {
            success = success && await this.delLocal(key);
        }

        if (useRedis) {
            success = success && await this.delRedis(key);
        }

        return success;
    }

    // Nettoyer tous les caches
    async flush() {
        try {
            this.localCache.flushAll();
            await this.redis.flushDb();
            return true;
        } catch (error) {
            LogService.error('Cache flush error:', error);
            return false;
        }
    }

    // Cache par utilisateur
    async getUserCache(userId, key) {
        return this.get(`user:${userId}:${key}`);
    }

    async setUserCache(userId, key, value, ttl = 3600) {
        return this.set(`user:${userId}:${key}`, value, { redisTTL: ttl });
    }

    async delUserCache(userId, key) {
        return this.del(`user:${userId}:${key}`);
    }
}

module.exports = new CacheManager();