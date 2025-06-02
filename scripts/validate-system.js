#!/usr/bin/env node

/**
 * Script de validation complète du système VoxKill
 * Vérifie que tous les composants sont correctement configurés
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Éviter les problèmes de logs pendant la validation
const MockLogService = {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {}
};

class SystemValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.success = [];
    }

    log(level, message, details = null) {
        const entry = { message, details, timestamp: new Date().toISOString() };
        
        switch (level) {
            case 'error':
                this.errors.push(entry);
                console.error(`❌ ERROR: ${message}`);
                break;
            case 'warning':
                this.warnings.push(entry);
                console.warn(`⚠️  WARNING: ${message}`);
                break;
            case 'success':
                this.success.push(entry);
                console.log(`✅ SUCCESS: ${message}`);
                break;
            case 'info':
                console.log(`ℹ️  INFO: ${message}`);
                break;
        }
    }

    validateEnvironment() {
        this.log('info', 'Validating environment variables...');

        // Variables critiques
        const critical = [
            'NODE_ENV',
            'MONGODB_URI',
            'JWT_SECRET',
            'FRONTEND_URL'
        ];

        // Variables importantes pour la production
        const production = [
            'OPENAI_API_KEY',
            'SMTP_HOST',
            'SMTP_USER',
            'SMTP_PASS'
        ];

        // Variables optionnelles
        const optional = [
            'REDIS_URL',
            'STRIPE_SECRET_KEY',
            'CSRF_SECRET'
        ];

        critical.forEach(key => {
            if (!process.env[key]) {
                this.log('error', `Missing critical environment variable: ${key}`);
            } else {
                this.log('success', `Critical env var configured: ${key}`);
            }
        });

        production.forEach(key => {
            if (!process.env[key]) {
                if (process.env.NODE_ENV === 'production') {
                    this.log('error', `Missing production environment variable: ${key}`);
                } else {
                    this.log('warning', `Missing environment variable (optional in dev): ${key}`);
                }
            } else {
                this.log('success', `Production env var configured: ${key}`);
            }
        });

        optional.forEach(key => {
            if (process.env[key]) {
                this.log('success', `Optional env var configured: ${key}`);
            } else {
                this.log('info', `Optional env var not configured: ${key}`);
            }
        });
    }

    async validateDatabase() {
        this.log('info', 'Validating database connection...');

        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });

            // Test basic operation
            await mongoose.connection.db.admin().ping();
            this.log('success', 'MongoDB connection successful');

            // Validate models
            const models = ['User', 'Transcript', 'Usage', 'Subscription'];
            models.forEach(modelName => {
                try {
                    require(`../src/models/${modelName}`);
                    this.log('success', `Model loaded successfully: ${modelName}`);
                } catch (error) {
                    this.log('error', `Failed to load model: ${modelName}`, error.message);
                }
            });

        } catch (error) {
            this.log('error', 'MongoDB connection failed', error.message);
        }
    }

    async validateServices() {
        this.log('info', 'Validating services...');

        // Services critiques
        const services = [
            'OpenAIService',
            'WhatsAppService',
            'NotificationsService',
            'SummaryService',
            'AdService',
            'LogService'
        ];

        for (const serviceName of services) {
            try {
                const service = require(`../src/services/${serviceName}`);
                this.log('success', `Service loaded successfully: ${serviceName}`);

                // Validation spécifique OpenAI
                if (serviceName === 'OpenAIService' && service.validateApiKey) {
                    try {
                        const validation = await service.validateApiKey();
                        if (validation.valid) {
                            this.log('success', 'OpenAI API key is valid');
                        } else {
                            this.log('error', 'OpenAI API key is invalid', validation.error);
                        }
                    } catch (error) {
                        this.log('warning', 'Could not validate OpenAI API key', error.message);
                    }
                }

            } catch (error) {
                this.log('error', `Failed to load service: ${serviceName}`, error.message);
            }
        }
    }

    async validateRoutes() {
        this.log('info', 'Validating routes...');

        const routes = [
            'auth',
            'users',
            'transcripts',
            'payment',
            'health',
            'legal'
        ];

        routes.forEach(routeName => {
            try {
                require(`../src/routes/${routeName}`);
                this.log('success', `Route loaded successfully: ${routeName}`);
            } catch (error) {
                this.log('error', `Failed to load route: ${routeName}`, error.message);
            }
        });
    }

    validateDirectories() {
        this.log('info', 'Validating required directories...');

        const fs = require('fs');
        const path = require('path');

        const requiredDirs = [
            'data/sessions',
            'data/temp',
            'logs'
        ];

        requiredDirs.forEach(dir => {
            const fullPath = path.join(process.cwd(), dir);
            try {
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { recursive: true });
                    this.log('success', `Created directory: ${dir}`);
                } else {
                    this.log('success', `Directory exists: ${dir}`);
                }
            } catch (error) {
                this.log('error', `Failed to create directory: ${dir}`, error.message);
            }
        });
    }

    async validateDependencies() {
        this.log('info', 'Validating critical dependencies...');

        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        // Vérifier FFmpeg
        try {
            await execAsync('ffmpeg -version');
            this.log('success', 'FFmpeg is installed');
        } catch (error) {
            this.log('error', 'FFmpeg is not installed or not in PATH');
        }

        // Vérifier Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion >= 18) {
            this.log('success', `Node.js version is compatible: ${nodeVersion}`);
        } else {
            this.log('error', `Node.js version too old: ${nodeVersion} (requires 18+)`);
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('🏥 SYSTEM VALIDATION REPORT');
        console.log('='.repeat(60));
        
        console.log(`\n✅ Success: ${this.success.length}`);
        console.log(`⚠️  Warnings: ${this.warnings.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);

        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.warnings.forEach(w => console.log(`   - ${w.message}`));
        }

        if (this.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.errors.forEach(e => console.log(`   - ${e.message}`));
        }

        console.log('\n' + '='.repeat(60));
        
        if (this.errors.length === 0) {
            console.log('🎉 SYSTEM IS READY FOR DEVELOPMENT!');
            console.log('\nNext steps:');
            console.log('1. Start the backend: npm run dev');
            console.log('2. Start the frontend: cd frontend && npm run dev');
            console.log('3. Open http://localhost:5173');
        } else {
            console.log('🚨 SYSTEM HAS CRITICAL ERRORS!');
            console.log('\nPlease fix the errors above before starting the application.');
            console.log('See DEV_SETUP.md for detailed setup instructions.');
            process.exit(1);
        }
    }

    async run() {
        console.log('🔍 Starting VoxKill system validation...\n');

        this.validateEnvironment();
        await this.validateDatabase();
        await this.validateServices();
        this.validateRoutes();
        this.validateDirectories();
        await this.validateDependencies();

        // Fermer la connexion MongoDB
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }

        this.generateReport();
    }
}

// Exécuter la validation
if (require.main === module) {
    const validator = new SystemValidator();
    validator.run().catch(error => {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    });
}

module.exports = SystemValidator;