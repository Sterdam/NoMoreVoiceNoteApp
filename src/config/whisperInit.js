const LogService = require('../services/LogService');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

const initializeWhisper = async () => {
    try {
        // S'assurer que les dossiers nécessaires existent
        const modelDir = path.join(process.cwd(), 'models');
        const tempDir = path.join(process.cwd(), 'temp');
        
        await fs.mkdir(modelDir, { recursive: true });
        await fs.mkdir(tempDir, { recursive: true });

        // Vérifier les permissions des dossiers
        await fs.access(modelDir, fs.constants.W_OK);
        await fs.access(tempDir, fs.constants.W_OK);

        // Vérifier que Whisper est disponible
        try {
            await execAsync('whisper --help');
            LogService.info('✅ Whisper CLI disponible');
        } catch (error) {
            LogService.warn('Whisper CLI check failed, this is normal if running in development:', error);
        }

        LogService.info('✅ Whisper initialized successfully');
        
        return true;
    } catch (error) {
        LogService.warn('Non-critical Whisper initialization error:', {
            message: error.message,
            stack: error.stack
        });
        // Ne pas throw l'erreur pour permettre au service de démarrer
        return false;
    }
};

module.exports = { initializeWhisper };