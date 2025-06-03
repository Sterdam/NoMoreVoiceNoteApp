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
            
            try {
                this.redis = getRedisClient();
                await this.restoreSessionsFromRedis();
            } catch (error) {
                LogService.warn('Redis not available, continuing without session persistence');
            }
            
            setInterval(() => this.performMemoryCleanup(), 300000);
            
            LogService.info('WhatsApp service initialized');
        } catch (error) {
            LogService.error('WhatsApp initialization error:', {
                message: error.message,
                stack: error.stack,
                code: error.code
            });
        }
    }

    async createUserSession(userId) {
        try {
            if (this.clients.has(userId)) {
                const existingClient = this.clients.get(userId);
                const state = await existingClient.getState().catch(() => null);
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
                        '--disable-gpu'
                    ]
                }
            });

            // Store client immediately
            this.clients.set(userId, client);

            // Loading screen event
            client.on('loading_screen', (percent, message) => {
                LogService.info('WhatsApp loading:', { userId, percent, message });
            });

            // QR code event
            client.on('qr', async (qr) => {
                try {
                    LogService.info('QR Code received for user:', { userId, qrLength: qr ? qr.length : 0 });
                    
                    const qrImage = await qrcode.toDataURL(qr, {
                        width: 300,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });
                    
                    // Extract base64 data
                    const base64Data = qrImage.split(',')[1];
                    this.pendingQRs.set(userId, base64Data);
                    
                    LogService.info('QR code stored for user:', { 
                        userId, 
                        qrLength: base64Data.length,
                        pendingQRsSize: this.pendingQRs.size 
                    });
                } catch (error) {
                    LogService.error('Error generating QR code:', { userId, error: error.message });
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
                
                if (this.redis) {
                    await this.removeSessionFromRedis(userId);
                }
                
                // Clean local session
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
                
                try {
                    const debugWWebVersion = await client.getWWebVersion();
                    LogService.info(`WWebVersion = ${debugWWebVersion}`, { userId });
                } catch (e) {
                    LogService.warn('Could not get WWeb version:', e);
                }
                
                // Setup page error handlers
                try {
                    if (client.pupPage) {
                        client.pupPage.on('pageerror', (err) => {
                            LogService.error('Page error:', { userId, error: err.toString() });
                        });
                        client.pupPage.on('error', (err) => {
                            LogService.error('Page error:', { userId, error: err.toString() });
                        });
                    }
                } catch (e) {
                    LogService.warn('Could not set page error handlers:', e);
                }
                
                // Get client info
                const info = client.info;
                LogService.info('Client info:', { 
                    userId, 
                    pushname: info?.pushname,
                    wid: info?.wid,
                    platform: info?.platform 
                });
                
                // Save self chat ID
                if (info?.wid) {
                    const selfChatId = info.wid.user + '@c.us';
                    this.selfChatIds.set(userId, selfChatId);
                }
                
                if (this.redis) {
                    await this.saveSessionToRedis(userId, 'connected');
                }
                this.stopReconnectAttempts(userId);
                
                // Send welcome message
                try {
                    const user = await this.getUserById(userId);
                    if (user?.settings?.separateConversation && client.info) {
                        const selfChatId = client.info.wid.user + '@c.us';
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

            // State change event
            client.on('change_state', state => {
                LogService.info('WhatsApp state changed:', { userId, state });
            });

            // Message event
            client.on('message', async (message) => {
                try {
                    // Check if it's a voice message
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
                if (this.redis) {
                    await this.saveSessionToRedis(userId, 'disconnected');
                }
                this.scheduleReconnect(userId);
            });

            // Initialize the client
            LogService.info('Initializing WhatsApp client...', { userId });
            
            try {
                await client.initialize();
            } catch (error) {
                LogService.error('Error initializing WhatsApp client:', { 
                    userId, 
                    error: error.message,
                    stack: error.stack 
                });
                this.clients.delete(userId);
                throw error;
            }
            
            return true;

        } catch (error) {
            LogService.error('Error creating WhatsApp session:', { 
                userId, 
                error: error.message,
                stack: error.stack 
            });
            this.clients.delete(userId);
            throw error;
        }
    }

    async handleVoiceMessage(message, userId, req) {
        try {
            // Check subscription and limits
            const subscription = await Subscription.findOne({ userId });
            if (!subscription || !subscription.isActive()) {
                await message.reply("❌ Votre abonnement a expiré. Renouvelez sur voxkill.com/dashboard");
                return;
            }
    
            const user = await this.getUserById(userId);
            const usage = await Usage.getOrCreate(userId, subscription._id);
            const AdService = require('./AdService');
            const SummaryService = require('./SummaryService');
            
            // Get contact and chat info
            const contact = await message.getContact();
            const chat = await message.getChat();
            const senderName = contact.pushname || contact.name || contact.number;
            
            // Download and process media
            const media = await message.downloadMedia();
            if (!media) {
                LogService.error('Failed to download media');
                await message.reply("❌ Impossible de télécharger le message vocal");
                return;
            }
            
            const filename = `audio_${Date.now()}`;
            const filepath = path.join(this.tempPath, `${filename}.ogg`);
            
            await fs.writeFile(filepath, Buffer.from(media.data, 'base64'));
            
            // Size and duration checks
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
            
            // Check quota
            const remainingMinutes = await usage.getRemainingMinutes();
            if (remainingMinutes < durationMinutes) {
                await message.reply(`❌ Quota dépassé. Il reste ${remainingMinutes.toFixed(1)} min.`);
                await this.cleanupTempFiles(filename);
                return;
            }
            
            // Processing message
            let processingMsg = null;
            if (!user.settings.separateConversation || subscription.plan === 'trial') {
                processingMsg = await message.reply("🎤 Transcription en cours...");
            }
            
            try {
                // Convert and transcribe
                const wavPath = await this.convertToWav(filepath);
                
                // Transcription via OpenAI
                const transcriptionResult = await OpenAIService.transcribe(wavPath, {
                    language: user.settings.transcriptionLanguage || 'fr',
                    model: 'whisper-1',
                    response_format: 'json'
                });
                
                // Generate summary if needed
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
                
                // Save transcription
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
                
                // Update usage
                await usage.addTranscription(durationMinutes, durationMinutes * 0.006, transcript._id);
                
                // Check and send quota notifications
                await NotificationService.checkAndNotifyQuotaUsage(userId);
                
                // Build response
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
                
                // Delete processing message if exists
                if (processingMsg) {
                    try {
                        await processingMsg.delete(true);
                    } catch (e) {
                        LogService.debug('Could not delete processing message:', e);
                    }
                }
                
                // Send response
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
        
        // Header with context
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
            // Simplified format for trial
            message += `📝 **Transcription** (${data.duration.toFixed(1)} min)\n\n`;
        }
        
        // Transcription
        message += `📄 **TRANSCRIPTION**\n`;
        message += `${data.text}\n`;
        
        // Summary if available
        if (data.summary && data.summaryLevel !== 'none') {
            const summaryInfo = SummaryService.getSummaryLevelInfo(data.summaryLevel);
            message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
            message += `${summaryInfo.icon} **${summaryInfo.name.toUpperCase()}**\n`;
            message += `${data.summary}\n`;
        }
        
        // Usage stats
        const percentUsed = ((data.totalMinutes - data.remainingMinutes) / data.totalMinutes * 100).toFixed(0);
        message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📊 **Utilisation**: ${percentUsed}% (${data.remainingMinutes.toFixed(0)}/${data.totalMinutes} min restantes)\n`;
        
        if (percentUsed > 80) {
            message += `⚠️ **Attention**: Plus que ${100 - percentUsed}% de quota !\n`;
        }
        
        // Add ad if free account
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
            
            // Get or create self chat ID
            let selfChatId = this.selfChatIds.get(userId);
            
            if (!selfChatId && client.info) {
                const userNumber = client.info.wid.user + '@c.us';
                selfChatId = userNumber;
                this.selfChatIds.set(userId, selfChatId);
                
                // Save in Redis for persistence
                if (this.redis) {
                    await this.redis.setEx(
                        `whatsapp:selfchat:${userId}`,
                        86400 * 30, // 30 days
                        selfChatId
                    );
                }
            }
            
            try {
                // Send message to self
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
                
                // Fallback: try to send in original chat
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
            LogService.info('Getting QR code for user:', { userId });
            
            let client = this.clients.get(userId);
            
            if (!client) {
                LogService.info('No client found, creating session:', { userId });
                await this.createUserSession(userId);
                client = this.clients.get(userId);
            }
            
            // Check if client is connected
            if (client) {
                try {
                    const state = await client.getState();
                    if (state === 'CONNECTED') {
                        LogService.info('Client already connected', { userId });
                        return { status: 'connected' };
                    }
                } catch (e) {
                    LogService.debug('Could not get client state:', e);
                }
            }
            
            // Wait a bit for QR to be generated if just created
            if (!this.pendingQRs.has(userId)) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            const qr = this.pendingQRs.get(userId);
            LogService.info('QR code status:', { 
                userId, 
                hasQR: !!qr, 
                qrLength: qr ? qr.length : 0,
                pendingQRsSize: this.pendingQRs.size
            });
            
            if (qr) {
                return { status: 'pending', qr };
            } else {
                return { status: 'pending', message: 'Génération du QR code en cours...' };
            }
        } catch (error) {
            LogService.error('Error getting QR code:', { 
                userId, 
                error: error.message,
                stack: error.stack 
            });
            throw error;
        }
    }

    async isConnected(userId) {
        try {
            const client = this.clients.get(userId);
            if (!client) return false;
            
            const state = await client.getState().catch(() => null);
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
                    LogService.debug('Error during logout:', e);
                }
                try {
                    await client.destroy();
                } catch (e) {
                    LogService.debug('Error destroying client:', e);
                }
                this.clients.delete(userId);
                this.pendingQRs.delete(userId);
                this.selfChatIds.delete(userId);
            }

            this.stopReconnectAttempts(userId);
            if (this.redis) {
                await this.removeSessionFromRedis(userId);
            }

            // Clean session directory
            const sessionDir = path.join(this.sessionPath, `session-${userId}`);
            try {
                await fs.rm(sessionDir, { recursive: true, force: true });
            } catch (err) {
                LogService.warn('Error cleaning session directory:', { userId, error: err });
            }

            LogService.info('User logged out successfully', { userId });
            return true;
        } catch (error) {
            LogService.error('Error during logout:', { userId, error });
            throw error;
        }
    }

    // Utility methods
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

    async getUserPhoneNumber(userId) {
        try {
            const user = await this.getUserById(userId);
            return user?.whatsappNumber || null;
        } catch (error) {
            LogService.error('Error getting user phone number:', { userId, error });
            return null;
        }
    }
    
    // Redis session management
    async saveSessionToRedis(userId, status) {
        if (!this.redis) return;
        
        try {
            const sessionData = {
                userId,
                status,
                lastActive: new Date().toISOString(),
                reconnectAttempts: 0
            };
            
            await this.redis.setEx(
                `whatsapp:session:${userId}`,
                86400, // 24 hours
                JSON.stringify(sessionData)
            );
            
            // Save selfChatId if available
            const selfChatId = this.selfChatIds.get(userId);
            if (selfChatId) {
                await this.redis.setEx(
                    `whatsapp:selfchat:${userId}`,
                    86400 * 30, // 30 days
                    selfChatId
                );
            }
        } catch (error) {
            LogService.error('Error saving session to Redis:', { userId, error });
        }
    }
    
    async removeSessionFromRedis(userId) {
        if (!this.redis) return;
        
        try {
            await this.redis.del(`whatsapp:session:${userId}`);
            await this.redis.del(`whatsapp:selfchat:${userId}`);
        } catch (error) {
            LogService.error('Error removing session from Redis:', { userId, error });
        }
    }
    
    async restoreSessionsFromRedis() {
        if (!this.redis) return;
        
        try {
            const keys = await this.redis.keys('whatsapp:session:*');
            
            for (const key of keys) {
                const sessionData = await this.redis.get(key);
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    if (session.status === 'connected' || session.status === 'authenticated') {
                        LogService.info('Restoring WhatsApp session:', { userId: session.userId });
                        
                        // Restore selfChatId
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
                    const state = await client.getState().catch(() => null);
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
            
            // Clean inactive clients
            for (const [userId, client] of this.clients.entries()) {
                try {
                    if (this.redis) {
                        const sessionData = await this.redis.get(`whatsapp:session:${userId}`);
                        if (sessionData) {
                            const session = JSON.parse(sessionData);
                            const lastActive = new Date(session.lastActive);
                            const hoursSinceActive = (Date.now() - lastActive) / (1000 * 60 * 60);
                            
                            const state = await client.getState().catch(() => null);
                            if (hoursSinceActive > 24 && state !== 'CONNECTED') {
                                LogService.info('Removing inactive client:', { userId, hoursSinceActive });
                                await this.logout(userId);
                            }
                        }
                    }
                } catch (error) {
                    LogService.error('Error during memory cleanup:', { userId, error });
                }
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                LogService.info('Garbage collection triggered');
            }
        }
    }
}

module.exports = new WhatsAppService();