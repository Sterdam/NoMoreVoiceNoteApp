// src/services/WhisperService.js
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const NodeCache = require('node-cache');
const LogService = require('./LogService');
const CryptoService = require('./CryptoService');

const execAsync = promisify(exec);

class WhisperService {
    constructor() {
        // Cache pour le modèle Whisper (30 minutes)
        this.modelCache = new NodeCache({ 
            stdTTL: 1800,
            checkperiod: 120
        });

        this.config = {
            model: process.env.WHISPER_MODEL || 'medium',
            modelsPath: path.join(process.cwd(), 'models'),
            tempPath: path.join(process.cwd(), 'temp')
        };

        this.initialize();
    }

    async initialize() {
        try {
            // Création des dossiers nécessaires
            await fs.mkdir(this.config.modelsPath, { recursive: true });
            await fs.mkdir(this.config.tempPath, { recursive: true });

            // Préchargement du modèle
            await this.preloadModel();
        } catch (error) {
            LogService.error('Whisper initialization error:', error);
            throw error;
        }
    }

    async preloadModel() {
        const modelKey = `model_${this.config.model}`;
    
        if (!this.modelCache.has(modelKey)) {
            try {
                LogService.info('Preloading Whisper model:', { model: this.config.model });
                
                // Suppression de l'option `--download-root`
                const command = `whisper --model ${this.config.model} --language French --device cuda --model_dir ${this.config.modelsPath}`;
                await execAsync(command);
                
                this.modelCache.set(modelKey, true);
                LogService.info('Model preloaded successfully');
            } catch (error) {
                LogService.error('Model preload error:', error);
                throw error;
            }
        }
    }

    async transcribe(filePath, userId) {
        let wavFile = null;
        try {
            // Convertir en WAV pour une meilleure qualité
            wavFile = await this.convertToWav(filePath);
            
            // Configuration de la transcription
            const options = [
                `--model ${this.config.model}`,
                '--language French',
                '--device cuda',
                '--output_format txt,vtt,json',
                '--word_timestamps True',
                '--temperature 0.2',
                '--best_of 5',
                '--beam_size 5',
                `--output_dir ${this.config.tempPath}`,
                '--verbose False'
            ].join(' ');

            const command = `whisper ${wavFile} ${options}`;
            LogService.info('Starting transcription:', { userId, command });

            const { stdout, stderr } = await execAsync(command);
            
            // Analyse des résultats
            const results = await this.processTranscriptionResults(wavFile);
            
            return {
                text: results.text,
                segments: results.segments,
                language: results.language,
                confidence: this.calculateConfidence(stderr),
                duration: results.duration
            };

        } catch (error) {
            LogService.error('Transcription error:', { userId, error });
            throw error;
        } finally {
            // Nettoyage des fichiers temporaires
            await this.cleanup(wavFile);
        }
    }

    async convertToWav(inputFile) {
        try {
            const outputFile = path.join(
                this.config.tempPath,
                `${path.basename(inputFile, path.extname(inputFile))}.wav`
            );

            const command = `ffmpeg -i ${inputFile} -ar 16000 -ac 1 -c:a pcm_s16le ${outputFile}`;
            await execAsync(command);

            return outputFile;
        } catch (error) {
            LogService.error('Audio conversion error:', error);
            throw error;
        }
    }

    async processTranscriptionResults(baseFile) {
        const baseName = path.basename(baseFile, '.wav');
        const resultsPath = path.join(this.config.tempPath, `${baseName}.json`);

        try {
            const jsonContent = await fs.readFile(resultsPath, 'utf8');
            const results = JSON.parse(jsonContent);

            return {
                text: results.text,
                segments: results.segments,
                language: results.language,
                duration: results.duration
            };
        } catch (error) {
            LogService.error('Results processing error:', error);
            throw error;
        }
    }

    calculateConfidence(stderr) {
        try {
            // Extraction du score de confiance des logs
            const confidenceMatch = stderr.match(/confidence: (\d+\.\d+)/);
            return confidenceMatch ? parseFloat(confidenceMatch[1]) : null;
        } catch (error) {
            return null;
        }
    }

    async cleanup(filePath) {
        if (!filePath) return;

        const extensions = ['.wav', '.txt', '.vtt', '.json'];
        const basePath = filePath.replace(path.extname(filePath), '');

        for (const ext of extensions) {
            try {
                const file = `${basePath}${ext}`;
                if (await this.fileExists(file)) {
                    await fs.unlink(file);
                }
            } catch (error) {
                LogService.error('Cleanup error:', { file: `${basePath}${ext}`, error });
            }
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = new WhisperService();