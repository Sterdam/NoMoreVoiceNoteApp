let Client, LocalAuth;
try {
    const whatsappWebJs = require('whatsapp-web.js');
    Client = whatsappWebJs.Client;
    LocalAuth = whatsappWebJs.LocalAuth;
    console.log('whatsapp-web.js loaded successfully');
} catch (error) {
    console.error('Failed to load whatsapp-web.js:', error);
    throw error;
}

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
        this.sessionPath = path.join(process.cwd(), '.wwebjs_auth');
        this.tempPath = path.join(process.cwd(), 'data', 'temp');
        this.redis = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Créer les dossiers nécessaires
            await fs.mkdir(this.sessionPath, { recursive: true });
            await fs.mkdir(this.tempPath, { recursive: true });
            
            // Permissions sur le dossier de session
            if (process.platform !== 'win32') {
                try {
                    await execAsync(`chmod -R 755 ${this.sessionPath}`);
                } catch (e) {
                    LogService.warn('Could not set permissions on session path');
                }
            }
            
            // Initialiser Redis si disponible
            try {
                this.redis = getRedisClient();
                LogService.info('Redis available for session persistence');
            } catch (error) {
                LogService.warn('Redis not available, continuing without session persistence');
            }
            
            LogService.info('WhatsApp service initialized', {
                sessionPath: this.sessionPath,
                tempPath: this.tempPath
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

            LogService.info('Creating new WhatsApp session for user:', { 
                userId,
                sessionPath: this.sessionPath,
                tempPath: this.tempPath,
                pathsExist: {
                    session: fsSync.existsSync(this.sessionPath),
                    temp: fsSync.existsSync(this.tempPath)
                }
            });

            let client;
            try {
                // Créer le client WhatsApp Web
                client = new Client({
                    authStrategy: new LocalAuth({
                        clientId: userId.toString(),
                        dataPath: this.sessionPath
                    }),
                    puppeteer: {
                        headless: true,
                        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-accelerated-2d-canvas',
                            '--no-first-run',
                            '--no-zygote',
                            '--single-process', // Important pour Docker
                            '--disable-gpu'
                        ]
                    }
                });
            } catch (clientError) {
                LogService.error('Error creating WhatsApp Client instance:', {
                    userId,
                    error: clientError.message,
                    stack: clientError.stack,
                    sessionPath: this.sessionPath,
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
                });
                throw clientError;
            }

            // Stocker le client immédiatement
            this.clients.set(userId, client);

            // === CONFIGURATION DES EVENT HANDLERS (AVANT initialize) ===
            
            // Loading screen
            client.on('loading_screen', (percent, message) => {
                LogService.info('LOADING SCREEN', { userId, percent, message });
            });

            // QR Code - Événement crucial
            client.on('qr', async (qr) => {
                LogService.info('QR RECEIVED', { userId });
                
                try {
                    // Générer l'image QR code
                    const qrDataURL = await qrcode.toDataURL(qr, {
                        width: 256,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });
                    
                    // Extraire la partie base64
                    const base64Data = qrDataURL.split(',')[1];
                    
                    // Stocker le QR
                    this.pendingQRs.set(userId, base64Data);
                    
                    LogService.info('QR code stored', { 
                        userId, 
                        qrLength: base64Data.length 
                    });
                } catch (error) {
                    LogService.error('Error generating QR code:', error);
                }
            });

            // Authenticated
            client.on('authenticated', () => {
                LogService.info('AUTHENTICATED', { userId });
                this.pendingQRs.delete(userId);
            });

            // Auth failure
            client.on('auth_failure', async (msg) => {
                LogService.error('AUTHENTICATION FAILURE', { userId, msg });
                this.pendingQRs.delete(userId);
                await this.cleanup(userId);
            });

            // Ready - Client prêt
            client.on('ready', async () => {
                LogService.info('READY', { userId });
                this.pendingQRs.delete(userId);
                
                try {
                    const info = client.info;
                    LogService.info('Client info:', {
                        userId,
                        pushname: info?.pushname,
                        wid: info?.wid?.user,
                        platform: info?.platform
                    });
                    
                    // Envoyer message de bienvenue
                    if (info?.wid) {
                        const selfChat = info.wid.user + '@c.us';
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

            // Message handler pour les messages vocaux
            client.on('message', async (msg) => {
                try {
                    // Vérifier si c'est un message vocal (ptt = push to talk)
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
                LogService.info('CHANGE STATE', { userId, state });
            });

            // Disconnected
            client.on('disconnected', (reason) => {
                LogService.warn('Client was logged out', { userId, reason });
                this.pendingQRs.delete(userId);
                this.cleanup(userId);
            });

            // === INITIALISER LE CLIENT ===
            LogService.info('Initializing WhatsApp client...', { userId });
            await client.initialize();
            
            return { success: true, status: 'initializing' };

        } catch (error) {
            LogService.error('Error creating WhatsApp session:', {
                userId,
                error: error.message,
                stack: error.stack,
                code: error.code,
                details: error.toString()
            });
            
            await this.cleanup(userId);
            throw error;
        }
    }

    async getQRCode(userId) {
        try {
            LogService.info('Getting QR code for user:', { userId });
            
            // Vérifier si le client existe
            let client = this.clients.get(userId);
            
            if (!client) {
                LogService.info('No client found, creating session', { userId });
                await this.createUserSession(userId);
                
                // Attendre un peu que le QR soit généré
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Vérifier l'état
            if (client) {
                try {
                    const state = await client.getState().catch(() => null);
                    if (state === 'CONNECTED') {
                        return { status: 'connected' };
                    }
                } catch (e) {
                    LogService.debug('Could not check state');
                }
            }
            
            // Récupérer le QR code
            const qr = this.pendingQRs.get(userId);
            
            if (qr) {
                LogService.info('QR code found', { userId });
                return { 
                    status: 'pending', 
                    qr: qr 
                };
            }
            
            // Si pas de QR, attendre encore un peu
            LogService.info('QR not ready yet, waiting...', { userId });
            
            // Réessayer pendant 10 secondes max
            for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const qrCheck = this.pendingQRs.get(userId);
                if (qrCheck) {
                    return { 
                        status: 'pending', 
                        qr: qrCheck 
                    };
                }
                
                // Vérifier aussi si connecté entre temps
                const state = await client?.getState().catch(() => null);
                if (state === 'CONNECTED') {
                    return { status: 'connected' };
                }
            }
            
            return { 
                status: 'pending',
                message: 'Génération du QR code en cours...'
            };

        } catch (error) {
            LogService.error('Error getting QR code:', {
                userId,
                error: error.message,
                stack: error.stack,
                code: error.code,
                details: error.toString()
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
                await message.reply(replyText);

                LogService.info('Voice message processed successfully', {
                    userId,
                    duration: durationMinutes,
                    language: transcriptionResult.language
                });

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