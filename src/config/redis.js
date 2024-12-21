// src/config/redis.js
const Redis = require('redis');
const LogService = require('../services/LogService');

let redisClient = null;

const setupRedis = async () => {
  try {
    if (!redisClient) {
      redisClient = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://redis:6379',
        password: process.env.REDIS_PASSWORD,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 5) return new Error('Too many connection attempts');
            return Math.min(retries * 1000, 3000);
          }
        }
      });

      redisClient.on('error', (error) => {
        LogService.error('Redis Client Error:', { 
          error: error.message, 
          stack: error.stack,
          name: error.name 
        });
      });

      redisClient.on('connect', () => {
        LogService.info('Redis Client Connected');
      });

      await redisClient.connect();
    }
    return redisClient;
  } catch (error) {
    LogService.error('Redis setup error:', { 
      error: error.message, 
      name: error.name,
      stack: error.stack 
    });
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

module.exports = {
  setupRedis,
  getRedisClient
};