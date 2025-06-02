const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs/promises');
const path = require('path');
const LogService = require('./LogService');
const OpenAIService = require('./OpenAIService');
const NotificationService = require('./NotificationsService');
const Transcript = require('../models/Transcript');
const Subscription = require('../models/Subscription');
const Usage = require('../models/Usage');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fsSync = require('fs');
const { getRedisClient } = require('../config/redis');
const { t } = require('../utils/translate');

class WhatsAppService {
    constructor() {
        this.clients = new Map();
        this.pendingQRs = new Map();
        this.sessionPath = path.join(process.cwd(), '.wwebjs_auth');
        this.tempPath = path.join(process.cwd(), 'data', 'temp');
        this.redis = null;
        this.reconnectIntervals = new Map();
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 30000;
        this.selfChatIds = new Map();
        this.initialize();
    }

    async initialize() {
        try {
            // Créer les dossiers nécessaires
            await fs.mkdir(this.sessionPath, { recursive: true });
            await fs.mkdir(this.tempPath, { recursive: true });
            
            // S'assurer que le dossier .wwebjs_auth existe avec les bonnes permissions
            if (process.platform !== 'win32') {
                try {
                    await execAsync(`chmod -R 755 ${this.sessionPath}`);
                } catch (e) {
                    LogService.warn('Could not set permissions on session path');
                }
            }
            
            this.redis = getRedisClient();
            await this.restoreSessionsFromRedis();
            
            setInterval(() => this.performMemoryCleanup(), 300000);
            
            LogService.info('WhatsApp service initialized');
        } catch (error) {
            LogService.error('WhatsApp initialization error:', error);
        }
    }

    async createUserSession(userId) {
        try {
            if (this.clients.has(userId)) {
                const existingClient = this.clients.get(userId);
                const state = await existingClient.getState();
                if (state === 'CONNECTED') {
                    LogService.info('Client already connected', { userId });
                    return true;
                }
                await this.logout(userId);
            }

            LogService.info('Creating WhatsApp session for user:', { userId });

            const client = new Client({
                authStrategy: new LocalAuth({
                    clientId: userId.toString(),
                    dataPath: this.sessionPath
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process', // Important pour certains environnements
                        '--disable-gpu'
                    ],
                    // Timeout plus long pour la connexion
                    timeout: 120000
                },
                // Options WhatsApp Web
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
                }
            });

            // Loading screen event
            client.on('loading_screen', (percent, message) => {
                LogService.info('WhatsApp loading:', { userId, percent, message });
            });

            // QR Code event
            client.on('qr', async (qr) => {
                try {
                    LogService.info('QR Code received for user:', { userId });
                    const qrImage = await qrcode.toDataURL(qr, {
                        width: 300,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });
                    this.pendingQRs.set(userId, qrImage.split(',')[1]);
                } catch (error) {
                    LogService.error('Error generating QR code:', { userId, error });
                }
            });

            // Authenticated event
            client.on('authenticated', () => {
                LogService.info('WhatsApp authenticated for user:', { userId });
                this.pendingQRs.delete(userId);
            });

            // Auth failure event
            client.on('auth_failure', async (msg) => {
                LogService.error('WhatsApp authentication failed:', { userId, msg });
                this.pendingQRs.delete(userId);
                await this.removeSessionFromRedis(userId);
                
                // Nettoyer la session locale
                const sessionDir = path.join(this.sessionPath, `session-${userId}`);
                try {
                    await fs.rm(sessionDir, { recursive: true, force: true });
                } catch (err) {
                    LogService.warn('Error cleaning session directory:', { userId, error: err });
                }
                
                this.logout(userId);
            });

            // Ready event
            client.on('ready', async () => {
                LogService.info('WhatsApp client ready for user:', { userId });
                this.pendingQRs.delete(userId);
                
                // Obtenir les informations du client
                const info = client.info;
                LogService.info('Client info:', { 
                    userId, 
                    pushname: info.pushname,
                    wid: info.wid,
                    platform: info.platform 
                });
                
                // Sauvegarder les infos du client
                const selfChatId = info.wid.user + '@c.us';
                this.selfChatIds.set(userId, selfChatId);
                
                await this.saveSessionToRedis(userId, 'connected');
                this.stopReconnectAttempts(userId);
                
                // Envoyer un message de bienvenue
                try {
                    const user = await this.getUserById(userId);
                    if (user.settings.separateConversation && client.info) {
                        await client.sendMessage(selfChatId, 
                            `🎉 *VoxKill connecté avec succès!*\n\n` +
                            `✅ Vos transcriptions seront envoyées ici\n` +
                            `📱 Envoyez-moi vos notes vocales depuis n'importe quelle conversation\n` +
                            `⚡ Transcription instantanée avec IA\n\n` +
                            `💡 _Astuce: Épinglez cette conversation pour un accès rapide_`
                        );
                    }
                } catch (e) {
                    LogService.debug('Could not send welcome message:', e);
                }
            });

            // Change state event
            client.on('change_state', state => {
                LogService.info('WhatsApp state changed:', { userId, state });
            });

            // Message event
            client.on('message', async (message) => {
                try {
                    // Vérifier si c'est un message vocal
                    if (message.hasMedia && message.type === 'ptt') {
                        LogService.info('Voice message received:', { 
                            userId, 
                            from: message.from,
                            messageId: message.id._serialized 
                        });
                        
                        const user = await this.getUserById(userId);
                        const req = { 
                            user: { 
                                language: user?.settings?.transcriptionLanguage || 'fr' 
                            } 
                        };
                        await this.handleVoiceMessage(message, userId, req);
                    }
                } catch (error) {
                    LogService.error('Message handling error:', error);
                }
            });

            // Disconnected event
            client.on('disconnected', async (reason) => {
                LogService.warn('WhatsApp disconnected:', { userId, reason });
                await this.saveSessionToRedis(userId, 'disconnected');
                this.scheduleReconnect(userId);
            });

            // Initialiser le client
            LogService.info('Initializing WhatsApp client...', { userId });
            await client.initialize();
            
            this.clients.set(userId, client);
            return true;

        } catch (error) {
            LogService.error('Error creating WhatsApp session:', { 
                userId, 
                error: error.message,
                stack: error.stack 
            });
            throw error;
        }
    }

    async handleVoiceMessage(message, userId, req) {
        try {
            // Vérifier l'abonnement et les limites
            const subscription = await Subscription.findOne({ userId });
            if (!subscription || !subscription.isActive()) {
                await message.reply("❌ Votre abonnement a expiré. Renouvelez sur voxkill.com/dashboard");
                return;
            }
    
            const user = await this.getUserById(userId);
            const usage = await Usage.getOrCreate(userId, subscription._id);
            const AdService = require('./AdService');
            const SummaryService = require('./SummaryService');
            
            // Obtenir les informations du contact
            const contact = await message.getContact();
            const chat = await message.getChat();
            const senderName = contact.pushname || contact.name || contact.number;
            
            // Télécharger et traiter le média
            const media = await message.downloadMedia();
            if (!media) {
                LogService.error('Failed to download media');
                await message.reply("❌ Impossible de télécharger le message vocal");
                return;
            }
            
            const filename = `audio_${Date.now()}`;
            const filepath = path.join(this.tempPath, `${filename}.ogg`);
            
            await fs.writeFile(filepath, Buffer.from(media.data, 'base64'));
            
            // Vérifications de taille et durée
            const stats = await fs.stat(filepath);
            const fileSizeMB = stats.size / (1024 * 1024);
            
            if (fileSizeMB > 25) {
                await message.reply("❌ Fichier trop volumineux (max 25MB)");
                await this.cleanupTempFiles(filename);
                return;
            }
            
            const duration = await this.getAudioDuration(filepath);
            const durationMinutes = duration / 60;
            
            if (duration > subscription.limits.maxAudioDuration) {
                const maxMinutes = subscription.limits.maxAudioDuration / 60;
                await message.reply(`❌ Audio trop long (max ${maxMinutes} min). Passez au plan supérieur.`);
                await this.cleanupTempFiles(filename);
                return;
            }
            
            // Vérifier le quota
            const remainingMinutes = await usage.getRemainingMinutes();
            if (remainingMinutes < durationMinutes) {
                await message.reply(`❌ Quota dépassé. Il reste ${remainingMinutes.toFixed(1)} min.`);
                await this.cleanupTempFiles(filename);
                return;
            }
            
            // Message de traitement en cours
            let processingMsg = null;
            if (!user.settings.separateConversation || subscription.plan === 'trial') {
                processingMsg = await message.reply("🎤 Transcription en cours...");
            }
            
            try {
                // Convertir et transcrire
                const wavPath = await this.convertToWav(filepath);
                
                // Transcription via OpenAI
                const transcriptionResult = await OpenAIService.transcribe(wavPath, {
                    language: user.settings.transcriptionLanguage || 'fr',
                    model: 'whisper-1',
                    response_format: 'json'
                });
                
                // Générer le résumé selon le niveau choisi
                let summary = null;
                if (user.settings.summaryLevel !== 'none' && subscription.plan !== 'trial') {
                    const canSummarize = await usage.canSummarize();
                    if (canSummarize) {
                        summary = await SummaryService.generateSummary(
                            transcriptionResult.text,
                            user.settings.summaryLevel,
                            user.settings.summaryLanguage === 'same' 
                                ? transcriptionResult.language 
                                : user.settings.summaryLanguage
                        );
                        
                        if (summary) {
                            await usage.addSummary(SummaryService.estimateCost(user.settings.summaryLevel), null);
                        }
                    }
                }
                
                // Sauvegarder la transcription
                const transcript = new Transcript({
                    userId,
                    messageId: message.id._serialized,
                    text: transcriptionResult.text,
                    summary,
                    audioLength: duration,
                    language: transcriptionResult.language,
                    confidence: transcriptionResult.confidence,
                    segments: transcriptionResult.segments || [],
                    status: 'completed',
                    metadata: {
                        originalFilename: filename,
                        mimeType: 'audio/ogg',
                        fileSize: stats.size,
                        processingTime: 0,
                        chatId: chat.id._serialized,
                        fromNumber: contact.number,
                        timestamp: new Date(message.timestamp * 1000),
                        cost: durationMinutes * 0.006
                    }
                });
                
                await transcript.save();
                
                // Mettre à jour l'utilisation
                await usage.addTranscription(durationMinutes, durationMinutes * 0.006, transcript._id);
                
                // Vérifier et envoyer les notifications de quota
                await NotificationService.checkAndNotifyQuotaUsage(userId);
                
                // Construire la réponse
                const replyText = this.formatTranscriptionMessage({
                    senderName,
                    senderNumber: contact.number,
                    chatName: chat.name || 'Chat privé',
                    timestamp: new Date(message.timestamp * 1000),
                    duration: durationMinutes,
                    text: transcriptionResult.text,
                    summary,
                    summaryLevel: user.settings.summaryLevel,
                    remainingMinutes: await usage.getRemainingMinutes(),
                    totalMinutes: subscription.limits.minutesPerMonth,
                    showAd: AdService.shouldShowAd(subscription),
                    language: transcriptionResult.language,
                    plan: subscription.plan
                });
                
                // Supprimer le message "en cours" si existe
                if (processingMsg) {
                    try {
                        // Dans les nouvelles versions, delete n'a pas de paramètre
                        await processingMsg.delete();
                    } catch (e) {
                        // Ignorer si impossible de supprimer
                    }
                }
                
                // Déterminer où envoyer la réponse
                if (user.settings.separateConversation && subscription.plan !== 'trial') {
                    await this.sendToSeparateConversation(userId, replyText, {
                        originalChat: chat,
                        originalContact: contact,
                        senderName
                    });
                } else {
                    await message.reply(replyText);
                }
                
                LogService.info('Voice message processed successfully', {
                    userId,
                    duration: durationMinutes,
                    language: transcriptionResult.language,
                    hasSummary: !!summary
                });
                
            } catch (transcriptionError) {
                LogService.error('Transcription error:', transcriptionError);
                await message.reply("❌ Erreur lors de la transcription. Support: support@voxkill.com");
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
        }
    }

    formatTranscriptionMessage(data) {
        const AdService = require('./AdService');
        const SummaryService = require('./SummaryService');
        
        let message = '';
        
        // En-tête avec contexte
        if (data.plan !== 'trial' && data.senderNumber) {
            const formattedDate = data.timestamp.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            message += `📍 **${data.chatName}**\n`;
            message += `👤 ${data.senderName} (${data.senderNumber})\n`;
            message += `📅 ${formattedDate}\n`;
            message += `⏱️ ${data.duration.toFixed(1)} min | 🌐 ${data.language.toUpperCase()}\n`;
            message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        } else {
            // Format simplifié pour trial
            message += `📝 **Transcription** (${data.duration.toFixed(1)} min)\n\n`;
        }
        
        // Transcription
        message += `📄 **TRANSCRIPTION**\n`;
        message += `${data.text}\n`;
        
        // Résumé si disponible
        if (data.summary && data.summaryLevel !== 'none') {
            const summaryInfo = SummaryService.getSummaryLevelInfo(data.summaryLevel);
            message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
            message += `${summaryInfo.icon} **${summaryInfo.name.toUpperCase()}**\n`;
            message += `${data.summary}\n`;
        }
        
        // Statistiques d'utilisation
        const percentUsed = ((data.totalMinutes - data.remainingMinutes) / data.totalMinutes * 100).toFixed(0);
        message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📊 **Utilisation**: ${percentUsed}% (${data.remainingMinutes.toFixed(0)}/${data.totalMinutes} min restantes)\n`;
        
        if (percentUsed > 80) {
            message += `⚠️ **Attention**: Plus que ${100 - percentUsed}% de quota !\n`;
        }
        
        // Ajouter publicité si compte gratuit
        if (data.showAd) {
            const ad = AdService.getRandomAd(data.language);
            message += AdService.formatAdForWhatsApp(ad);
        }
        
        // Footer
        message += `\n💬 _VoxKill - voxkill.com_`;
        
        return message;
    }
    
    async sendToSeparateConversation(userId, message, context) {
        try {
            const client = this.clients.get(userId);
            if (!client) {
                LogService.error('Client not found for separate conversation');
                return;
            }
            
            // Obtenir ou créer l'ID de la conversation self
            let selfChatId = this.selfChatIds.get(userId);
            
            if (!selfChatId && client.info) {
                // Obtenir le numéro de l'utilisateur
                const userNumber = client.info.wid.user + '@c.us';
                selfChatId = userNumber;
                this.selfChatIds.set(userId, selfChatId);
                
                // Sauvegarder dans Redis pour persistance
                await this.redis.setEx(
                    `whatsapp:selfchat:${userId}`,
                    86400 * 30, // 30 jours
                    selfChatId
                );
            }
            
            try {
                // Envoyer le message à soi-même
                await client.sendMessage(selfChatId, message);
                
                LogService.info('Message sent to separate conversation', {
                    userId,
                    selfChatId,
                    originalChat: context.originalChat.name
                });
                
            } catch (sendError) {
                LogService.error('Error sending to self chat:', {
                    error: sendError.message,
                    selfChatId
                });
                
                // Fallback: essayer d'envoyer dans le chat original
                try {
                    const fallbackMessage = `[📥 Transcription privée]\n${message}`;
                    await client.sendMessage(context.originalChat.id._serialized, fallbackMessage);
                } catch (fallbackError) {
                    LogService.error('Fallback send also failed:', fallbackError);
                }
            }
            
        } catch (error) {
            LogService.error('Error in sendToSeparateConversation:', {
                userId,
                error: error.message,
                stack: error.stack
            });
        }
    }

    async getQRCode(userId) {
        try {
            const client = this.clients.get(userId);
            
            if (!client) {
                await this.createUserSession(userId);
                // Attendre un peu pour que le QR soit généré
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const qr = this.pendingQRs.get(userId);
            return qr || null;
        } catch (error) {
            LogService.error('Error getting QR code:', { userId, error });
            throw error;
        }
    }

    async isConnected(userId) {
        try {
            const client = this.clients.get(userId);
            if (!client) return false;
            
            const state = await client.getState();
            return state === 'CONNECTED';
        } catch (error) {
            LogService.error('Error checking connection:', { userId, error });
            return false;
        }
    }

    async logout(userId) {
        try {
            const client = this.clients.get(userId);
            if (client) {
                try {
                    await client.logout();
                } catch (e) {
                    // Ignorer les erreurs de logout
                }
                await client.destroy();
                this.clients.delete(userId);
                this.pendingQRs.delete(userId);
                this.selfChatIds.delete(userId);
            }

            this.stopReconnectAttempts(userId);
            await this.removeSessionFromRedis(userId);

            // Nettoyer le dossier de session
            const sessionDir = path.join(this.sessionPath, `session-${userId}`);
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

    // Méthodes utilitaires
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
    
    // Redis session management
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
            
            // Sauvegarder aussi le selfChatId si disponible
            const selfChatId = this.selfChatIds.get(userId);
            if (selfChatId) {
                await this.redis.setEx(
                    `whatsapp:selfchat:${userId}`,
                    86400 * 30, // 30 jours
                    selfChatId
                );
            }
        } catch (error) {
            LogService.error('Error saving session to Redis:', { userId, error });
        }
    }
    
    async removeSessionFromRedis(userId) {
        try {
            await this.redis.del(`whatsapp:session:${userId}`);
            await this.redis.del(`whatsapp:selfchat:${userId}`);
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
                        
                        // Restaurer aussi le selfChatId
                        const selfChatId = await this.redis.get(`whatsapp:selfchat:${session.userId}`);
                        if (selfChatId) {
                            this.selfChatIds.set(session.userId, selfChatId);
                        }
                        
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
            return;
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
                const client = this.clients.get(userId);
                if (client) {
                    const state = await client.getState();
                    if (state === 'CONNECTED') {
                        this.stopReconnectAttempts(userId);
                    }
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
                        
                        const state = await client.getState();
                        if (hoursSinceActive > 24 && state !== 'CONNECTED') {
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
}

module.exports = new WhatsAppService();