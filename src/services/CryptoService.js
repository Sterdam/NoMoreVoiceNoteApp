// src/services/CryptoService.js
const crypto = require('crypto');
const fs = require('fs').promises;
const CryptoJS = require('crypto-js');
const LogService = require('./LogService');

class CryptoService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.masterKey = process.env.CRYPTO_KEY || this.generateKey();
        
        if (!process.env.CRYPTO_KEY) {
            LogService.warn('CRYPTO_KEY not set in environment, using generated key (not recommended for production)');
        }
    }

    generateKey() {
        return crypto.randomBytes(this.keyLength).toString('hex');
    }

    async encryptFile(filepath, userEncryptionKey) {
        try {
            const fileData = await fs.readFile(filepath);
            const iv = crypto.randomBytes(this.ivLength);
            const key = Buffer.from(userEncryptionKey, 'hex');

            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            const encrypted = Buffer.concat([cipher.update(fileData), cipher.final()]);
            const authTag = cipher.getAuthTag();

            const encryptedFilepath = `${filepath}.enc`;
            const metadata = {
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            };

            // Sauvegarder le fichier chiffré avec les métadonnées
            await fs.writeFile(
                encryptedFilepath,
                Buffer.concat([
                    Buffer.from(JSON.stringify(metadata) + '\n'),
                    encrypted
                ])
            );

            LogService.info('File encrypted successfully', { filepath: encryptedFilepath });
            return encryptedFilepath;
        } catch (error) {
            LogService.error('File encryption error:', error);
            throw new Error('Failed to encrypt file');
        }
    }

    async decryptFile(filepath, userEncryptionKey) {
        try {
            const fileData = await fs.readFile(filepath);
            const metadataEnd = fileData.indexOf('\n');
            const metadata = JSON.parse(fileData.slice(0, metadataEnd));
            const encryptedData = fileData.slice(metadataEnd + 1);

            const key = Buffer.from(userEncryptionKey, 'hex');
            const iv = Buffer.from(metadata.iv, 'hex');
            const authTag = Buffer.from(metadata.authTag, 'hex');

            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([
                decipher.update(encryptedData),
                decipher.final()
            ]);

            LogService.info('File decrypted successfully', { filepath });
            return decrypted;
        } catch (error) {
            LogService.error('File decryption error:', error);
            throw new Error('Failed to decrypt file');
        }
    }

    // Chiffrement des données en mémoire
    encryptData(data, userEncryptionKey) {
        try {
            return CryptoJS.AES.encrypt(
                JSON.stringify(data),
                userEncryptionKey
            ).toString();
        } catch (error) {
            LogService.error('Data encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    // Déchiffrement des données en mémoire
    decryptData(encryptedData, userEncryptionKey) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, userEncryptionKey);
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch (error) {
            LogService.error('Data decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }
}

module.exports = new CryptoService();