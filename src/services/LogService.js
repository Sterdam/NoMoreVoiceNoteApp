// src/services/LogService.js
const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

class LogService {
    constructor() {
        const logDir = path.join(process.cwd(), 'logs');

        // Format personnalisé pour les logs
        const customFormat = winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.metadata({ fillWith: ['userId', 'type'] })
        );

        // Configuration de la rotation des logs
        const fileRotateTransport = new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'app-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            maxSize: '20m',
            format: customFormat
        });

        // Configuration du logger
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: customFormat,
            transports: [
                fileRotateTransport,
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    info(message, meta = {}) {
        this.logger.info(message, { metadata: meta });
    }

    error(message, meta = {}) {
        this.logger.error(message, { metadata: meta });
    }

    warn(message, meta = {}) {
        this.logger.warn(message, { metadata: meta });
    }

    debug(message, meta = {}) {
        this.logger.debug(message, { metadata: meta });
    }

    // Méthode pour nettoyer les données sensibles
    _sanitize(data) {
        const sensitiveKeys = ['password', 'token', 'secret'];
        const sanitized = { ...data };

        Object.keys(sanitized).forEach(key => {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                sanitized[key] = '[REDACTED]';
            }
        });

        return sanitized;
    }
}

// Exporter une instance unique
module.exports = new LogService();