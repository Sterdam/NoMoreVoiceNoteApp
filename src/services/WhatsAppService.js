const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs/promises');
const path = require('path');
const LogService = require('./LogService');
const OpenAIService = require('./OpenAIService');
const { Transcript } = require('../models/Transcript');
const Subscription = require('../models/Subscription');
const Usage = require('../models/Usage');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fsSync = require('fs');
const { getRedisClient } = require('../config/redis');
const QueueService = require('./QueueService');

class WhatsAppService {
    constructor() {
        this.clients = new Map();
        this.pendingQRs = new Map();
        this.sessionPath = path.join(process.cwd(), 'data', 'sessions');
        this.tempPath = path.join(process.cwd(), 'data', 'temp');
        this.redis = null;
        this.reconnectIntervals = new Map();
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 30000; // 30 secondes
        this.initialize();
    }

    async initialize() {
        try {
            await fs.mkdir(this.sessionPath, { recursive: true });
            await fs.mkdir(this.tempPath, { recursive: true });
            
            // Initialiser Redis pour les sessions
            this.redis = getRedisClient();
            
            // Restaurer les sessions depuis Redis
            await this.restoreSessionsFromRedis();
            
            // Nettoyer la mémoire périodiquement
            setInterval(() => this.performMemoryCleanup(), 300000); // 5 minutes
            
            LogService.info('WhatsApp service initialized with Redis support');
        } catch (error) {
            LogService.error('WhatsApp initialization error:', error);
        }
    }

    async handleVoiceMessage(message, userId) {
        try {
            // Vérifier l'abonnement et les limites
            const subscription = await Subscription.findOne({ userId });
            if (!subscription || !subscription.isActive()) {
                await message.reply('❌ Votre abonnement a expiré. Veuillez le renouveler pour continuer.');
                return;
            }

            const user = await this.getUserById(userId);
            const usage = await Usage.getOrCreate(userId, subscription._id);
            
            // Télécharger le média
            const media = await message.downloadMedia();
            const filename = `audio_${Date.now()}`;
            const filepath = path.join(this.tempPath, `${filename}.ogg`);
            
            await fs.writeFile(filepath, Buffer.from(media.data, 'base64'));
            
            // Obtenir la durée de l'audio
            const duration = await this.getAudioDuration(filepath);
            const durationMinutes = duration / 60;
            
            // Vérifier les limites
            if (duration > subscription.limits.maxAudioDuration) {
                await message.reply(`❌ Audio trop long. Limite: ${subscription.limits.maxAudioDuration / 60} minutes.`);
                await this.cleanupTempFiles(filename);
                return;
            }
            
            if (!await usage.canTranscribe(durationMinutes)) {
                const remaining = await usage.getRemainingMinutes();
                await message.reply(`❌ Limite mensuelle atteinte. Minutes restantes: ${remaining.toFixed(1)}`);
                await this.cleanupTempFiles(filename);
                return;
            }
            
            await message.reply('🎤 Message vocal reçu ! Transcription en cours...');
            
            try {
                // Convertir en WAV pour l'API
                const wavPath = await this.convertToWav(filepath);
                
                // Ajouter à la queue de transcription
                const jobInfo = await QueueService.addTranscriptionJob({
                    userId,
                    filePath: wavPath,
                    messageId: message.id._serialized,
                    language: user.settings.transcriptionLanguage || 'fr',
                    autoSummarize: user.settings.autoSummarize,
                    plan: subscription.plan
                }, {
                    priority: subscription.plan === 'premium' || subscription.plan === 'enterprise'
                });
                
                // Attendre le résultat du job
                const result = await this.waitForJobResult(jobInfo.id, message);
                
                if (result.state === 'completed') {
                    // Créer la transcription dans la DB
                    const transcript = new Transcript({
                        userId,
                        messageId: message.id._serialized,
                        text: result.returnvalue.text,
                        audioLength: duration,
                        language: result.returnvalue.language,
                        summary: result.returnvalue.summary,
                        status: 'completed',
                        metadata: {
                            originalFilename: filename,
                            processingTime: result.returnvalue.processingTime,
                            jobId: jobInfo.id
                        }
                    });
                    
                    await transcript.save();
                    
                    // Mettre à jour l'utilisation
                    const costEstimate = await OpenAIService.estimateCost(duration, user.settings.autoSummarize);
                    await usage.addTranscription(durationMinutes, costEstimate.whisperCost, transcript._id);
                    
                    // Envoyer la transcription
                    let replyText = `📝 **Transcription:**\n\n${result.returnvalue.text}`;
                    
                    if (result.returnvalue.summary) {
                        await usage.addSummary(costEstimate.summaryCost, transcript._id);
                        replyText += `\n\n📌 **Résumé:**\n${result.returnvalue.summary}`;
                    }
                    
                    // Ajouter les infos d'utilisation
                    const remainingMinutes = await usage.getRemainingMinutes();
                    replyText += `\n\n⏱️ Minutes restantes ce mois: ${remainingMinutes.toFixed(1)}`;
                    
                    await message.reply(replyText);
                } else {
                    throw new Error(`Job failed: ${result.failedReason}`);
                }
                
            } catch (transcriptionError) {
                LogService.error('Transcription error:', transcriptionError);
                await message.reply('❌ Désolé, je n\'ai pas pu transcrire ce message vocal.');
                throw transcriptionError;
            } finally {
                await this.cleanupTempFiles(filename);
            }
            
        } catch (error) {
            LogService.error('Error processing voice message:', {
                userId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async getAudioDuration(filepath) {
        try {
            const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`;
            const { stdout } = await execAsync(command);
            return parseFloat(stdout.trim());
        } catch (error) {
            LogService.error('Error getting audio duration:', error);
            return 0;
        }
    }

    async convertToWav(filepath) {
        const wavPath = filepath.replace('.ogg', '.wav');
        const command = `ffmpeg -i "${filepath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`;
        
        await execAsync(command);
        return wavPath;
    }

    async cleanupTempFiles(filename) {
        const baseFilename = filename.replace('.ogg', '');
        const extensions = ['.ogg', '.wav'];
        
        for (const ext of extensions) {
            const filePath = path.join(this.tempPath, baseFilename + ext);
            try {
                if (fsSync.existsSync(filePath)) {
                    await fs.unlink(filePath);
                }
            } catch (error) {
                LogService.warn(`Error deleting file ${filePath}:`, error);
            }
        }
    }

    async getUserById(userId) {
        const User = require('../models/User');
        return User.findById(userId);
    }

    async createUserSession(userId) {
        try {
            if (this.clients.has(userId)) {
                const existingClient = this.clients.get(userId);
                if (existingClient.isConnected) {
                    return true;
                }
                await this.logout(userId);
            }

            const client = new Client({
                authStrategy: new LocalAuth({ clientId: userId.toString() }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--disable-extensions'
                    ]
                }
            });

            client.on('qr', async (qr) => {
                try {
                    const qrImage = await qrcode.toDataURL(qr);
                    this.pendingQRs.set(userId, qrImage.split(',')[1]);
                    LogService.info('QR Code generated for user:', { userId });
                } catch (error) {
                    LogService.error('Error generating QR code:', { userId, error });
                }
            });

            client.on('ready', async () => {
                LogService.info('WhatsApp client ready for user:', { userId });
                this.pendingQRs.delete(userId);
                
                // Sauvegarder l'état dans Redis
                await this.saveSessionToRedis(userId, 'connected');
                
                // Arrêter les tentatives de reconnexion
                this.stopReconnectAttempts(userId);
            });

            client.on('authenticated', async () => {
                LogService.info('WhatsApp authenticated for user:', { userId });
                this.pendingQRs.delete(userId);
                await this.saveSessionToRedis(userId, 'authenticated');
            });

            client.on('message', async (message) => {
                try {
                    if (message.hasMedia && message.type === 'ptt') {
                        await this.handleVoiceMessage(message, userId);
                    }
                } catch (error) {
                    LogService.error('Message handling error:', error);
                }
            });

            client.on('auth_failure', async () => {
                LogService.warn('WhatsApp authentication failed for user:', { userId });
                this.pendingQRs.delete(userId);
                await this.removeSessionFromRedis(userId);
                this.logout(userId);
            });
            
            client.on('disconnected', async (reason) => {
                LogService.warn('WhatsApp disconnected:', { userId, reason });
                await this.saveSessionToRedis(userId, 'disconnected');
                
                // Planifier une reconnexion automatique
                this.scheduleReconnect(userId);
            });

            await client.initialize();
            this.clients.set(userId, client);
            return true;

        } catch (error) {
            LogService.error('Error creating WhatsApp session:', { userId, error });
            throw error;
        }
    }

    async getQRCode(userId) {
        try {
            if (!this.clients.has(userId)) {
                await this.createUserSession(userId);
            }
            return this.pendingQRs.get(userId);
        } catch (error) {
            LogService.error('Error getting QR code:', { userId, error });
            throw error;
        }
    }

    async isConnected(userId) {
        try {
            const client = this.clients.get(userId);
            return client?.isConnected || false;
        } catch (error) {
            LogService.error('Error checking connection:', { userId, error });
            return false;
        }
    }

    async logout(userId) {
        try {
            const client = this.clients.get(userId);
            if (client) {
                await client.destroy();
                this.clients.delete(userId);
                this.pendingQRs.delete(userId);
            }

            // Arrêter les tentatives de reconnexion
            this.stopReconnectAttempts(userId);
            
            // Supprimer de Redis
            await this.removeSessionFromRedis(userId);

            const sessionDir = path.join(this.sessionPath, userId.toString());
            try {
                await fs.rm(sessionDir, { recursive: true, force: true });
            } catch (err) {
                LogService.warn('Error cleaning session directory:', { userId, error: err });
            }

            return true;
        } catch (error) {
            LogService.error('Error during logout:', { userId, error });
            throw error;
        }
    }
    
    // Nouvelles méthodes pour la gestion Redis et la reconnexion
    async saveSessionToRedis(userId, status) {
        try {
            const sessionData = {
                userId,
                status,
                lastActive: new Date().toISOString(),
                reconnectAttempts: 0
            };
            
            await this.redis.setEx(
                `whatsapp:session:${userId}`,
                86400, // 24 heures
                JSON.stringify(sessionData)
            );
        } catch (error) {
            LogService.error('Error saving session to Redis:', { userId, error });
        }
    }
    
    async removeSessionFromRedis(userId) {
        try {
            await this.redis.del(`whatsapp:session:${userId}`);
        } catch (error) {
            LogService.error('Error removing session from Redis:', { userId, error });
        }
    }
    
    async restoreSessionsFromRedis() {
        try {
            const keys = await this.redis.keys('whatsapp:session:*');
            
            for (const key of keys) {
                const sessionData = await this.redis.get(key);
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    if (session.status === 'connected' || session.status === 'authenticated') {
                        LogService.info('Restoring WhatsApp session:', { userId: session.userId });
                        await this.createUserSession(session.userId);
                    }
                }
            }
        } catch (error) {
            LogService.error('Error restoring sessions from Redis:', error);
        }
    }
    
    scheduleReconnect(userId) {
        if (this.reconnectIntervals.has(userId)) {
            return; // Déjà programmé
        }
        
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            
            if (attempts > this.maxReconnectAttempts) {
                LogService.warn('Max reconnect attempts reached:', { userId });
                this.stopReconnectAttempts(userId);
                return;
            }
            
            LogService.info('Attempting to reconnect WhatsApp:', { userId, attempt: attempts });
            
            try {
                await this.createUserSession(userId);
                // Si succès, isConnected arrêtera l'intervalle
                if (await this.isConnected(userId)) {
                    this.stopReconnectAttempts(userId);
                }
            } catch (error) {
                LogService.error('Reconnect attempt failed:', { userId, attempt: attempts, error });
            }
        }, this.reconnectDelay);
        
        this.reconnectIntervals.set(userId, interval);
    }
    
    stopReconnectAttempts(userId) {
        const interval = this.reconnectIntervals.get(userId);
        if (interval) {
            clearInterval(interval);
            this.reconnectIntervals.delete(userId);
        }
    }
    
    async performMemoryCleanup() {
        const memUsage = process.memoryUsage();
        const heapPercentage = memUsage.heapUsed / memUsage.heapTotal;
        
        if (heapPercentage > 0.8) {
            LogService.warn('High memory usage detected, performing cleanup', {
                heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
                percentage: `${(heapPercentage * 100).toFixed(2)}%`
            });
            
            // Nettoyer les clients inactifs
            for (const [userId, client] of this.clients.entries()) {
                try {
                    const sessionData = await this.redis.get(`whatsapp:session:${userId}`);
                    if (sessionData) {
                        const session = JSON.parse(sessionData);
                        const lastActive = new Date(session.lastActive);
                        const hoursSinceActive = (Date.now() - lastActive) / (1000 * 60 * 60);
                        
                        if (hoursSinceActive > 24 && !client.isConnected) {
                            LogService.info('Removing inactive client:', { userId, hoursSinceActive });
                            await this.logout(userId);
                        }
                    }
                } catch (error) {
                    LogService.error('Error during memory cleanup:', { userId, error });
                }
            }
            
            // Forcer le garbage collection si disponible
            if (global.gc) {
                global.gc();
                LogService.info('Garbage collection triggered');
            }
        }
    }
    
    async waitForJobResult(jobId, message, maxAttempts = 60) {
        for (let i = 0; i < maxAttempts; i++) {
            const jobStatus = await QueueService.getJobStatus(jobId);
            
            if (jobStatus.state === 'completed') {
                return jobStatus;
            }
            
            if (jobStatus.state === 'failed') {
                throw new Error(jobStatus.failedReason || 'Job failed');
            }
            
            // Envoyer une mise à jour de progression
            if (i > 0 && i % 10 === 0 && jobStatus.progress) {
                await message.reply(`⏳ Transcription en cours... ${jobStatus.progress}%`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('Job timeout');
    }
}

module.exports = new WhatsAppService();