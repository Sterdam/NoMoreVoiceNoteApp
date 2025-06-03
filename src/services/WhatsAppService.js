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

class WhatsAppService {
    constructor() {
        this.clients = new Map();
        this.pendingQRs = new Map();
        this.connectionStates = new Map();
        // Utiliser un chemin fixe pour les sessions WhatsApp
        this.sessionPath = process.env.WHATSAPP_SESSION_PATH || '/app/.wwebjs_auth';
        this.tempPath = process.env.TEMP_PATH || '/app/data/temp';
        this.redis = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Créer les dossiers nécessaires
            await fs.mkdir(this.sessionPath, { recursive: true });
            await fs.mkdir(this.tempPath, { recursive: true });
            
            // Initialiser Redis si disponible
            try {
                this.redis = getRedisClient();
                LogService.info('Redis available for WhatsApp session persistence');
            } catch (error) {
                LogService.warn('Redis not available for WhatsApp, continuing without session persistence');
            }
            
            LogService.info('WhatsApp service initialized', {
                sessionPath: this.sessionPath,
                tempPath: this.tempPath,
                pathsExist: {
                    session: fsSync.existsSync(this.sessionPath),
                    temp: fsSync.existsSync(this.tempPath)
                }
            });
        } catch (error) {
            LogService.error('WhatsApp initialization error:', error);
        }
    }

    async createUserSession(userId) {
        try {
            // Vérifier et nettoyer toute session existante
            if (this.clients.has(userId)) {
                const existingClient = this.clients.get(userId);
                try {
                    const state = await existingClient.getState().catch(() => null);
                    if (state === 'CONNECTED') {
                        LogService.info('Client already connected', { userId });
                        return { success: true, status: 'connected' };
                    }
                } catch (e) {
                    // Client existe mais problématique, on le nettoie
                }
                await this.cleanup(userId);
            }

            LogService.info('Creating new WhatsApp session for user:', { userId });

            // Marquer comme en cours de création
            this.connectionStates.set(userId, 'initializing');

            // Configuration Puppeteer optimisée pour Docker
            const puppeteerConfig = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-site-isolation-trials',
                    '--disable-features=BlockInsecurePrivateNetworkRequests'
                ]
            };

            // Ajouter le chemin de l'exécutable si fourni
            if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            }

            const client = new Client({
                authStrategy: new LocalAuth({
                    clientId: userId.toString(),
                    dataPath: this.sessionPath
                }),
                puppeteer: puppeteerConfig,
                qrMaxRetries: 5,
                takeoverOnConflict: true,
                takeoverTimeoutMs: 60000
            });

            // Stocker le client immédiatement
            this.clients.set(userId, client);

            // Configuration des event handlers
            this.setupEventHandlers(client, userId);

            // Initialiser le client
            LogService.info('Initializing WhatsApp client...', { userId });
            await client.initialize();
            
            return { success: true, status: 'initializing' };

        } catch (error) {
            LogService.error('Error creating WhatsApp session:', {
                userId,
                error: error.message,
                stack: error.stack
            });
            
            this.connectionStates.set(userId, 'error');
            await this.cleanup(userId);
            throw error;
        }
    }

    setupEventHandlers(client, userId) {
        // Loading screen
        client.on('loading_screen', (percent, message) => {
            LogService.info('WhatsApp loading screen', { userId, percent, message });
            this.connectionStates.set(userId, 'loading');
        });

        // QR Code
        client.on('qr', async (qr) => {
            LogService.info('QR code received', { userId });
            this.connectionStates.set(userId, 'qr_ready');
            
            try {
                // Générer l'image QR code
                const qrDataURL = await qrcode.toDataURL(qr, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    },
                    errorCorrectionLevel: 'M'
                });
                
                // Extraire la partie base64
                const base64Data = qrDataURL.split(',')[1];
                
                // Stocker le QR
                this.pendingQRs.set(userId, base64Data);
                
                // Stocker aussi dans Redis si disponible
                if (this.redis) {
                    try {
                        await this.redis.set(`whatsapp:qr:${userId}`, base64Data, 'EX', 300); // 5 minutes
                    } catch (e) {
                        LogService.debug('Could not store QR in Redis:', e);
                    }
                }
                
                LogService.info('QR code stored successfully', { 
                    userId, 
                    qrLength: base64Data.length 
                });
            } catch (error) {
                LogService.error('Error generating QR code:', error);
            }
        });

        // Authenticated
        client.on('authenticated', () => {
            LogService.info('WhatsApp authenticated', { userId });
            this.connectionStates.set(userId, 'authenticated');
            this.pendingQRs.delete(userId);
            
            // Nettoyer Redis
            if (this.redis) {
                this.redis.del(`whatsapp:qr:${userId}`).catch(() => {});
            }
        });

        // Auth failure
        client.on('auth_failure', async (msg) => {
            LogService.error('WhatsApp authentication failure', { userId, msg });
            this.connectionStates.set(userId, 'auth_failed');
            this.pendingQRs.delete(userId);
            await this.cleanup(userId);
        });

        // Ready
        client.on('ready', async () => {
            LogService.info('WhatsApp client ready', { userId });
            this.connectionStates.set(userId, 'connected');
            this.pendingQRs.delete(userId);
            
            try {
                const info = client.info;
                LogService.info('WhatsApp client info:', {
                    userId,
                    pushname: info?.pushname,
                    wid: info?.wid?.user,
                    platform: info?.platform
                });
                
                // Envoyer message de bienvenue
                if (info?.wid) {
                    const selfChat = info.wid._serialized;
                    await client.sendMessage(selfChat, 
                        '🎉 *VoxKill connecté!*\n\n' +
                        '✅ Je suis prêt à transcrire vos messages vocaux\n' +
                        '🎤 Envoyez-moi un message vocal depuis n\'importe quelle conversation\n' +
                        '⚡ Vous recevrez la transcription instantanément!'
                    );
                }
            } catch (e) {
                LogService.debug('Could not send welcome message:', e);
            }
        });

        // Message handler
        client.on('message', async (msg) => {
            try {
                // Vérifier si c'est un message vocal
                if (msg.hasMedia && msg.type === 'ptt') {
                    LogService.info('Voice message received', {
                        userId,
                        from: msg.from,
                        timestamp: msg.timestamp
                    });
                    
                    await this.handleVoiceMessage(msg, userId);
                }
            } catch (error) {
                LogService.error('Error handling message:', error);
            }
        });

        // State change
        client.on('change_state', state => {
            LogService.info('WhatsApp state changed', { userId, state });
            this.connectionStates.set(userId, state);
        });

        // Disconnected
        client.on('disconnected', (reason) => {
            LogService.warn('WhatsApp client disconnected', { userId, reason });
            this.connectionStates.set(userId, 'disconnected');
            this.pendingQRs.delete(userId);
            this.cleanup(userId);
        });
    }

    async getQRCode(userId) {
        try {
            LogService.info('Getting QR code for user:', { userId });
            
            // Vérifier l'état de connexion
            const state = this.connectionStates.get(userId);
            
            // Si déjà connecté
            if (state === 'connected') {
                return { status: 'connected' };
            }
            
            // Si erreur
            if (state === 'error' || state === 'auth_failed') {
                throw new Error('Connection failed. Please try again.');
            }
            
            // Vérifier si un QR est déjà disponible
            let qr = this.pendingQRs.get(userId);
            
            // Si pas de QR en mémoire, vérifier Redis
            if (!qr && this.redis) {
                try {
                    qr = await this.redis.get(`whatsapp:qr:${userId}`);
                } catch (e) {
                    LogService.debug('Could not get QR from Redis:', e);
                }
            }
            
            if (qr) {
                LogService.info('QR code found', { userId });
                return { 
                    status: 'pending', 
                    qr: qr 
                };
            }
            
            // Si pas de client, créer la session
            if (!this.clients.has(userId) || state === 'disconnected') {
                LogService.info('Creating new session', { userId });
                await this.createUserSession(userId);
            }
            
            // Attendre que le QR soit généré (max 15 secondes)
            for (let i = 0; i < 15; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Vérifier l'état
                const currentState = this.connectionStates.get(userId);
                if (currentState === 'connected') {
                    return { status: 'connected' };
                }
                
                if (currentState === 'error' || currentState === 'auth_failed') {
                    throw new Error('Connection failed');
                }
                
                // Vérifier le QR
                qr = this.pendingQRs.get(userId);
                if (!qr && this.redis) {
                    try {
                        qr = await this.redis.get(`whatsapp:qr:${userId}`);
                    } catch (e) {
                        // Ignorer
                    }
                }
                
                if (qr) {
                    return { 
                        status: 'pending', 
                        qr: qr 
                    };
                }
            }
            
            // Si toujours pas de QR après 15 secondes
            return { 
                status: 'initializing',
                message: 'Génération du QR code en cours...'
            };

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
            LogService.error('Error checking connection:', error);
            return false;
        }
    }

    async logout(userId) {
        try {
            LogService.info('Logout requested for user:', { userId });
            
            const client = this.clients.get(userId);
            if (client) {
                try {
                    await client.logout();
                } catch (e) {
                    LogService.debug('Logout error (normal if not connected):', e.message);
                }
                
                try {
                    await client.destroy();
                } catch (e) {
                    LogService.debug('Destroy error:', e.message);
                }
            }
            
            await this.cleanup(userId);
            
            LogService.info('User logged out successfully', { userId });
            return true;
        } catch (error) {
            LogService.error('Error during logout:', error);
            throw error;
        }
    }

    async cleanup(userId) {
        // Nettoyer toutes les références
        this.clients.delete(userId);
        this.pendingQRs.delete(userId);
        this.connectionStates.delete(userId);
        
        // Nettoyer Redis
        if (this.redis) {
            try {
                await this.redis.del(`whatsapp:qr:${userId}`);
            } catch (e) {
                // Ignorer
            }
        }
        
        // Nettoyer le dossier de session
        const sessionDir = path.join(this.sessionPath, `session-${userId}`);
        try {
            await fs.rm(sessionDir, { recursive: true, force: true });
        } catch (err) {
            // C'est OK si le dossier n'existe pas
        }
    }

    async handleVoiceMessage(message, userId) {
        try {
            // Vérifier l'abonnement
            const subscription = await Subscription.findOne({ userId });
            if (!subscription || !subscription.isActive()) {
                await message.reply('❌ Votre abonnement a expiré. Renouvelez sur voxkill.com/dashboard');
                return;
            }

            // Récupérer l'utilisateur et l'usage
            const User = require('../models/User');
            const user = await User.findById(userId);
            const usage = await Usage.getOrCreate(userId, subscription._id);

            // Vérifier le quota
            const remainingMinutes = await usage.getRemainingMinutes();
            if (remainingMinutes <= 0) {
                await message.reply(`❌ Quota dépassé. Il vous reste 0 minutes.`);
                return;
            }

            // Télécharger le media
            const media = await message.downloadMedia();
            if (!media) {
                await message.reply('❌ Impossible de télécharger le message vocal');
                return;
            }

            // Message de traitement
            const processingMsg = await message.reply('🎤 Transcription en cours...');

            // Sauvegarder le fichier
            const filename = `audio_${Date.now()}_${userId}`;
            const filepath = path.join(this.tempPath, `${filename}.ogg`);
            await fs.writeFile(filepath, Buffer.from(media.data, 'base64'));

            try {
                // Obtenir la durée
                const duration = await this.getAudioDuration(filepath);
                const durationMinutes = duration / 60;

                // Vérifier la durée max
                if (duration > subscription.limits.maxAudioDuration) {
                    const maxMinutes = subscription.limits.maxAudioDuration / 60;
                    await processingMsg.delete(true);
                    await message.reply(`❌ Audio trop long (max ${maxMinutes} min)`);
                    return;
                }

                // Vérifier le quota restant
                if (durationMinutes > remainingMinutes) {
                    await processingMsg.delete(true);
                    await message.reply(`❌ Audio trop long. Il vous reste ${remainingMinutes.toFixed(1)} min`);
                    return;
                }

                // Convertir en WAV
                const wavPath = await this.convertToWav(filepath);

                // Transcrire avec OpenAI
                const transcriptionResult = await OpenAIService.transcribe(wavPath, {
                    language: user.settings?.transcriptionLanguage || 'fr'
                });

                // Générer un résumé si activé
                let summary = null;
                if (user.settings?.summaryLevel && user.settings.summaryLevel !== 'none' && subscription.plan !== 'trial') {
                    const SummaryService = require('./SummaryService');
                    summary = await SummaryService.generateSummary(
                        transcriptionResult.text,
                        user.settings.summaryLevel,
                        user.settings.summaryLanguage || 'fr'
                    );
                }

                // Sauvegarder la transcription
                const transcript = new Transcript({
                    userId,
                    messageId: message.id._serialized,
                    text: transcriptionResult.text,
                    summary,
                    audioLength: duration,
                    language: transcriptionResult.language,
                    status: 'completed',
                    metadata: {
                        fromNumber: message.from,
                        timestamp: new Date(message.timestamp * 1000),
                        cost: durationMinutes * 0.006
                    }
                });
                await transcript.save();

                // Mettre à jour l'usage
                await usage.addTranscription(durationMinutes, durationMinutes * 0.006, transcript._id);

                // Construire la réponse
                let replyText = `📝 **TRANSCRIPTION**\n\n${transcriptionResult.text}`;
                
                if (summary) {
                    replyText += `\n\n📌 **RÉSUMÉ**\n${summary}`;
                }

                const newRemaining = await usage.getRemainingMinutes();
                replyText += `\n\n📊 _${newRemaining.toFixed(0)} min restantes_`;

                // Ajouter une pub si plan gratuit
                if (subscription.plan === 'trial') {
                    const AdService = require('./AdService');
                    const ad = AdService.getRandomAd('fr');
                    replyText += AdService.formatAdForWhatsApp(ad);
                }

                // Supprimer le message de traitement et envoyer la réponse
                await processingMsg.delete(true);
                
                // Envoyer dans une conversation séparée si configuré
                let targetChat = message.from;
                if (user.settings?.separateConversation && subscription.features?.separateConversation) {
                    targetChat = message.to; // Envoyer à soi-même
                }
                
                await message.client.sendMessage(targetChat, replyText);

                LogService.info('Voice message processed successfully', {
                    userId,
                    duration: durationMinutes,
                    language: transcriptionResult.language
                });

                // Vérifier et notifier le quota
                await NotificationService.checkAndNotifyQuotaUsage(userId);

            } finally {
                // Nettoyer les fichiers temporaires
                await this.cleanupTempFiles(filename);
            }

        } catch (error) {
            LogService.error('Error processing voice message:', error);
            await message.reply('❌ Erreur lors de la transcription. Support: support@voxkill.com');
        }
    }

    async getAudioDuration(filepath) {
        try {
            const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`;
            const { stdout } = await execAsync(command);
            return parseFloat(stdout.trim()) || 0;
        } catch (error) {
            LogService.error('Error getting audio duration:', error);
            // Fallback: estimer 60 secondes par défaut
            return 60;
        }
    }

    async convertToWav(filepath) {
        const wavPath = filepath.replace('.ogg', '.wav');
        const command = `ffmpeg -i "${filepath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`;
        await execAsync(command);
        return wavPath;
    }

    async cleanupTempFiles(filename) {
        const extensions = ['.ogg', '.wav'];
        for (const ext of extensions) {
            try {
                const filePath = path.join(this.tempPath, filename + ext);
                if (fsSync.existsSync(filePath)) {
                    await fs.unlink(filePath);
                }
            } catch (error) {
                // Ignorer les erreurs de suppression
            }
        }
    }
}

module.exports = new WhatsAppService();