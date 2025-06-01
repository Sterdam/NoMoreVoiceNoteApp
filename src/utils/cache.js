// src/utils/cache.js
const NodeCache = require('node-cache');
const { getRedisClient } = require('../config/redis');
const LogService = require('../services/LogService');
const crypto = require('crypto');

class CacheManager {
    constructor() {
        // Cache local pour les données fréquemment accédées
        this.localCache = new NodeCache({
            stdTTL: 300, // 5 minutes
            checkperiod: 60,
            useClones: false,
            maxKeys: 10000 // Limite pour éviter les fuites mémoire
        });

        // Client Redis pour le cache distribué
        this.redis = getRedisClient();

        // Stratégies de cache par type de données
        this.strategies = {
            transcription: {
                localTTL: 600, // 10 minutes
                redisTTL: 86400, // 24 heures
                prefix: 'trans:'
            },
            whatsappSession: {
                localTTL: 1800, // 30 minutes
                redisTTL: 7200, // 2 heures
                prefix: 'wa:session:'
            },
            userProfile: {
                localTTL: 300, // 5 minutes
                redisTTL: 3600, // 1 heure
                prefix: 'user:profile:'
            },
            apiResponse: {
                localTTL: 60, // 1 minute
                redisTTL: 300, // 5 minutes
                prefix: 'api:'
            }
        };

        // Métriques de cache
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };

        this.setupMetrics();
    }

    // Cache local avec gestion des erreurs
    async getLocal(key) {
        try {
            const value = this.localCache.get(key);
            if (value !== undefined) {
                this.metrics.hits++;
            } else {
                this.metrics.misses++;
            }
            return value;
        } catch (error) {
            LogService.error('Local cache get error:', { key, error });
            return undefined;
        }
    }

    async setLocal(key, value, ttl = 300) {
        try {
            // Vérifier la taille avant d'ajouter
            const stats = this.localCache.getStats();
            if (stats.keys >= 9000) { // 90% de la limite
                // Supprimer les clés les plus anciennes
                const keys = this.localCache.keys();
                const toDelete = keys.slice(0, 1000); // Supprimer 1000 clés
                toDelete.forEach(k => this.localCache.del(k));
                LogService.warn('Local cache cleanup performed', { deleted: toDelete.length });
            }

            const success = this.localCache.set(key, value, ttl);
            if (success) {
                this.metrics.sets++;
            }
            return success;
        } catch (error) {
            LogService.error('Local cache set error:', { key, error });
            return false;
        }
    }

    async delLocal(key) {
        try {
            const success = this.localCache.del(key);
            if (success) {
                this.metrics.deletes++;
            }
            return success;
        } catch (error) {
            LogService.error('Local cache del error:', { key, error });
            return false;
        }
    }

    // Cache Redis avec compression pour les grandes données
    async getRedis(key) {
        try {
            const value = await this.redis.get(key);
            if (!value) {
                this.metrics.misses++;
                return null;
            }
            
            this.metrics.hits++;
            
            // Décompression si nécessaire
            if (value.startsWith('gzip:')) {
                const compressed = Buffer.from(value.substring(5), 'base64');
                const decompressed = await this.decompress(compressed);
                return JSON.parse(decompressed);
            }
            
            return JSON.parse(value);
        } catch (error) {
            LogService.error('Redis get error:', { key, error: error.message });
            return null;
        }
    }

    async setRedis(key, value, ttl = 3600) {
        try {
            let stringValue = JSON.stringify(value);
            
            // Compression pour les grandes données (> 1KB)
            if (stringValue.length > 1024) {
                const compressed = await this.compress(stringValue);
                stringValue = 'gzip:' + compressed.toString('base64');
            }
            
            await this.redis.set(key, stringValue, 'EX', ttl);
            this.metrics.sets++;
            return true;
        } catch (error) {
            LogService.error('Redis set error:', { key, error: error.message });
            return false;
        }
    }

    async delRedis(key) {
        try {
            const result = await this.redis.del(key);
            if (result) {
                this.metrics.deletes++;
            }
            return result > 0;
        } catch (error) {
            LogService.error('Redis del error:', { key, error: error.message });
            return false;
        }
    }

    // Méthodes de compression
    async compress(data) {
        const zlib = require('zlib');
        return new Promise((resolve, reject) => {
            zlib.gzip(data, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    async decompress(data) {
        const zlib = require('zlib');
        return new Promise((resolve, reject) => {
            zlib.gunzip(data, (err, result) => {
                if (err) reject(err);
                else resolve(result.toString());
            });
        });
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

    // Cache avec stratégie
    async getWithStrategy(type, key, options = {}) {
        const strategy = this.strategies[type];
        if (!strategy) {
            throw new Error(`Unknown cache strategy: ${type}`);
        }

        const fullKey = strategy.prefix + key;
        return this.get(fullKey, {
            useLocal: options.useLocal !== false,
            useRedis: options.useRedis !== false
        });
    }

    async setWithStrategy(type, key, value, options = {}) {
        const strategy = this.strategies[type];
        if (!strategy) {
            throw new Error(`Unknown cache strategy: ${type}`);
        }

        const fullKey = strategy.prefix + key;
        return this.set(fullKey, value, {
            useLocal: options.useLocal !== false,
            useRedis: options.useRedis !== false,
            localTTL: options.localTTL || strategy.localTTL,
            redisTTL: options.redisTTL || strategy.redisTTL
        });
    }

    async delWithStrategy(type, key) {
        const strategy = this.strategies[type];
        if (!strategy) {
            throw new Error(`Unknown cache strategy: ${type}`);
        }

        const fullKey = strategy.prefix + key;
        return this.del(fullKey);
    }

    // Cache de transcription avec clé unique
    async getTranscription(userId, fileHash) {
        return this.getWithStrategy('transcription', `${userId}:${fileHash}`);
    }

    async setTranscription(userId, fileHash, transcription) {
        return this.setWithStrategy('transcription', `${userId}:${fileHash}`, transcription);
    }

    // Cache de session WhatsApp
    async getWhatsAppSession(phone) {
        return this.getWithStrategy('whatsappSession', phone);
    }

    async setWhatsAppSession(phone, session) {
        return this.setWithStrategy('whatsappSession', phone, session);
    }

    async invalidateWhatsAppSession(phone) {
        return this.delWithStrategy('whatsappSession', phone);
    }

    // Générer un hash pour les fichiers
    generateFileHash(filePath) {
        const fs = require('fs');
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(fileBuffer).digest('hex');
    }

    // Invalidation par pattern
    async invalidatePattern(pattern) {
        try {
            // Invalider dans Redis
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }

            // Invalider dans le cache local
            const localKeys = this.localCache.keys();
            const regex = new RegExp(pattern.replace('*', '.*'));
            localKeys.forEach(key => {
                if (regex.test(key)) {
                    this.localCache.del(key);
                }
            });

            LogService.info('Cache invalidated by pattern', { pattern, count: keys.length });
            return true;
        } catch (error) {
            LogService.error('Pattern invalidation error:', { pattern, error });
            return false;
        }
    }

    // Configuration des métriques
    setupMetrics() {
        // Rapport de métriques toutes les 5 minutes
        setInterval(() => {
            const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
            LogService.info('Cache metrics', {
                ...this.metrics,
                hitRate: `${(hitRate * 100).toFixed(2)}%`,
                localStats: this.localCache.getStats()
            });
        }, 300000);
    }

    // Obtenir les métriques
    getMetrics() {
        const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
        return {
            ...this.metrics,
            hitRate,
            localStats: this.localCache.getStats()
        };
    }
}

module.exports = new CacheManager();