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
            checkperiod: 120,
            useClones: false
        });

        this.config = {
            model: process.env.WHISPER_MODEL || 'base',
            modelsPath: path.join(process.cwd(), 'models'),
            tempPath: path.join(process.cwd(), 'temp')
        };

        this.initialize();
    }

    async initialize() {
        try {
            // Création des dossiers nécessaires s'ils n'existent pas
            await fs.mkdir(this.config.modelsPath, { recursive: true });
            await fs.mkdir(this.config.tempPath, { recursive: true });

            // Vérification de l'installation de Whisper
            await this.checkWhisperInstallation();

            LogService.info('WhisperService initialized successfully');
        } catch (error) {
            LogService.error('WhisperService initialization error:', error);
            throw new Error('Failed to initialize WhisperService');
        }
    }

    async checkWhisperInstallation() {
        try {
            await execAsync('whisper --help');
            LogService.info('Whisper CLI is available');
        } catch (error) {
            LogService.error('Whisper CLI not found:', error);
            throw new Error('Whisper CLI is not properly installed');
        }
    }

    async preloadModel() {
        const modelKey = `model_${this.config.model}`;
    
        if (!this.modelCache.has(modelKey)) {
            try {
                LogService.info('Preloading Whisper model:', { model: this.config.model });
                
                // Commande de préchargement du modèle
                const command = `whisper --model ${this.config.model} --language French --model_dir ${this.config.modelsPath} --device cpu`;
                const { stdout, stderr } = await execAsync(command);
                
                if (stderr) {
                    LogService.warn('Whisper model preload warning:', { stderr });
                }
                
                this.modelCache.set(modelKey, true);
                LogService.info('Model preloaded successfully');
            } catch (error) {
                LogService.error('Model preload error:', error);
                throw new Error(`Failed to preload Whisper model: ${error.message}`);
            }
        }
    }

    async transcribe(filePath, userId, options = {}) {
        let wavFile = null;
        let originalFilename = path.basename(filePath);
        const startTime = Date.now();

        try {
            // Vérifier que le fichier existe
            await fs.access(filePath);

            // Convertir en WAV pour une meilleure qualité
            wavFile = await this.convertToWav(filePath);
            
            // Configuration de la transcription
            const transcriptionOptions = {
                model: options.model || this.config.model,
                language: options.language || 'French',
                device: options.device || 'cpu',
                temperature: options.temperature || 0.2,
                bestOf: options.bestOf || 5,
                beamSize: options.beamSize || 5,
                wordTimestamps: true,
                outputFormats: ['txt', 'vtt', 'json']
            };

            const command = this.buildTranscriptionCommand(wavFile, transcriptionOptions);
            LogService.info('Starting transcription:', { userId, command });

            const { stdout, stderr } = await execAsync(command);
            
            // Traiter les résultats
            const results = await this.processTranscriptionResults(wavFile);
            const processingTime = Date.now() - startTime;
            
            // Enrichir les résultats avec des métadonnées
            return {
                text: results.text,
                segments: results.segments,
                language: results.language,
                confidence: this.calculateConfidence(stderr),
                duration: results.duration,
                metadata: {
                    originalFilename,
                    processingTime,
                    modelUsed: transcriptionOptions.model,
                    audioFormat: path.extname(filePath).slice(1)
                }
            };

        } catch (error) {
            LogService.error('Transcription error:', { userId, error });
            throw new Error(`Transcription failed: ${error.message}`);
        } finally {
            // Nettoyage des fichiers temporaires
            await this.cleanup(wavFile);
        }
    }

    buildTranscriptionCommand(inputFile, options) {
        const commandParts = [
            'whisper',
            inputFile,
            `--model ${options.model}`,
            `--language ${options.language}`,
            `--device ${options.device}`,
            '--output_format ' + options.outputFormats.join(','),
            '--word_timestamps True',
            `--temperature ${options.temperature}`,
            `--best_of ${options.bestOf}`,
            `--beam_size ${options.beamSize}`,
            `--output_dir ${this.config.tempPath}`,
            '--verbose False'
        ];

        return commandParts.join(' ');
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
            throw new Error('Failed to convert audio file to WAV format');
        }
    }

    async processTranscriptionResults(baseFile) {
        const baseName = path.basename(baseFile, '.wav');
        const resultsPath = path.join(this.config.tempPath, `${baseName}.json`);

        try {
            const jsonContent = await fs.readFile(resultsPath, 'utf8');
            const results = JSON.parse(jsonContent);

            // Validation des résultats
            if (!results.text || !Array.isArray(results.segments)) {
                throw new Error('Invalid transcription results format');
            }

            return {
                text: results.text,
                segments: this.normalizeSegments(results.segments),
                language: results.language,
                duration: results.duration
            };
        } catch (error) {
            LogService.error('Results processing error:', error);
            throw new Error('Failed to process transcription results');
        }
    }

    normalizeSegments(segments) {
        return segments.map(segment => ({
            start: Number(segment.start),
            end: Number(segment.end),
            text: segment.text.trim(),
            confidence: segment.confidence || null
        }));
    }

    calculateConfidence(stderr) {
        try {
            if (!stderr) return null;
            
            const confidenceMatch = stderr.match(/confidence: (\d+\.\d+)/);
            const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : null;
            
            // Vérifier que la valeur est dans une plage valide (0-1)
            return confidence !== null && confidence >= 0 && confidence <= 1 ? confidence : null;
        } catch (error) {
            LogService.warn('Error calculating confidence score:', error);
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
                    LogService.debug(`Cleaned up file: ${file}`);
                }
            } catch (error) {
                LogService.warn('Cleanup warning:', { file: `${basePath}${ext}`, error: error.message });
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

    getModelInfo() {
        return {
            currentModel: this.config.model,
            modelsPath: this.config.modelsPath,
            isModelCached: this.modelCache.has(`model_${this.config.model}`),
            supportedModels: ['tiny', 'base', 'small', 'medium', 'large']
        };
    }
}

module.exports = new WhisperService();