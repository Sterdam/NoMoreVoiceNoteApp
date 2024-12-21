const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs/promises');
const path = require('path');
const LogService = require('./LogService');
const { Transcript } = require('../models/Transcript');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fsSync = require('fs');

class WhatsAppService {
    constructor() {
        this.clients = new Map();
        this.pendingQRs = new Map();
        this.sessionPath = path.join(process.cwd(), 'data', 'sessions');
        this.tempPath = path.join(process.cwd(), 'data', 'temp');
        this.initialize();
    }

    async initialize() {
        try {
            await fs.mkdir(this.sessionPath, { recursive: true });
            await fs.mkdir(this.tempPath, { recursive: true });
            LogService.info('WhatsApp service initialized');
        } catch (error) {
            LogService.error('WhatsApp initialization error:', error);
        }
    }

    async transcribeAudio(filepath) {
        return new Promise(async (resolve, reject) => {
            try {
                const wavPath = filepath.replace('.ogg', '.wav');
                const ffmpegCommand = `ffmpeg -i "${filepath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`;
                
                LogService.info('Converting audio...');
                await execAsync(ffmpegCommand);

                LogService.info('Starting transcription...');
                const command = `whisper "${wavPath}" --model base --language French --output_dir "${this.tempPath}" --output_format txt`;
                
                await execAsync(command);
                
                const expectedTxtFile = wavPath.replace('.wav', '.txt');
                
                if (fsSync.existsSync(expectedTxtFile)) {
                    const transcription = await fs.readFile(expectedTxtFile, 'utf8');
                    resolve(transcription.trim());
                } else {
                    reject(new Error('Transcription file not found'));
                }
            } catch (error) {
                LogService.error('Transcription error:', error);
                reject(error);
            }
        });
    }

    async cleanupTempFiles(filename) {
        const baseFilename = filename.replace('.ogg', '');
        const extensions = ['.ogg', '.wav', '.txt', '.json'];
        
        for (const ext of extensions) {
            const filePath = path.join(this.tempPath, baseFilename + ext);
            try {
                if (fsSync.existsSync(filePath)) {
                    await fs.unlink(filePath);
                    LogService.info(`Deleted file: ${filePath}`);
                }
            } catch (error) {
                LogService.warn(`Error deleting file ${filePath}:`, error);
            }
        }
    }

    async handleVoiceMessage(message, userId) {
        try {
            await message.reply('🎤 Message vocal reçu ! Transcription en cours...');
            
            const media = await message.downloadMedia();
            const filename = `audio_${Date.now()}`;
            const filepath = path.join(this.tempPath, `${filename}.ogg`);
            
            // Sauvegarder le fichier audio
            await fs.writeFile(filepath, Buffer.from(media.data, 'base64'));
            
            try {
                // Transcrire l'audio
                const transcription = await this.transcribeAudio(filepath);
                
                // Créer l'entrée dans la base de données
                const transcript = new Transcript({
                    userId,
                    messageId: message.id._serialized,
                    text: transcription,
                    audioLength: 0, // À implémenter si nécessaire
                    language: 'fr',
                    status: 'completed'
                });

                await transcript.save();
                
                // Envoyer la transcription
                await message.reply(`📝 Transcription:\n\n${transcription}`);
                
            } catch (transcriptionError) {
                LogService.error('Transcription error:', transcriptionError);
                await message.reply('Désolé, je n\'ai pas pu transcrire ce message vocal.');
                throw transcriptionError;
            } finally {
                // Nettoyer les fichiers temporaires
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

    // ... rest of the methods (createUserSession, getQRCode, etc.) remain unchanged ...
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

            client.on('ready', () => {
                LogService.info('WhatsApp client ready for user:', { userId });
                this.pendingQRs.delete(userId);
            });

            client.on('authenticated', () => {
                LogService.info('WhatsApp authenticated for user:', { userId });
                this.pendingQRs.delete(userId);
            });

            client.on('message', async (message) => {
                if (message.hasMedia && message.type === 'ptt') {
                    await this.handleVoiceMessage(message, userId);
                }
            });

            client.on('auth_failure', () => {
                LogService.warn('WhatsApp authentication failed for user:', { userId });
                this.pendingQRs.delete(userId);
                this.logout(userId);
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
}

module.exports = new WhatsAppService();