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
            model: process.env.WHISPER_MODEL || 'medium', // Changé en medium pour de meilleurs résultats
            modelsPath: path.join(process.cwd(), 'models'),
            tempPath: path.join(process.cwd(), 'temp')
        };

        this.initialize();
    }

    async initialize() {
        try {
            await fs.mkdir(this.config.modelsPath, { recursive: true });
            await fs.mkdir(this.config.tempPath, { recursive: true });
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
            await fs.access(filePath);
            wavFile = await this.convertToWav(filePath);
            
            const transcriptionOptions = {
                model: options.model || this.config.model,
                language: options.language || 'French',
                device: options.device || 'cpu',
                temperature: 0.1, // Réduit pour plus de précision
                bestOf: 8, // Augmenté pour plus de candidats
                beamSize: 10, // Augmenté pour une meilleure exploration
                wordTimestamps: true,
                outputFormats: ['txt', 'vtt', 'json'],
                initial_prompt: "Transcription d'un message vocal WhatsApp en français.",
                condition_on_previous_text: true,
                no_speech_threshold: 0.6,
                compression_ratio_threshold: 2.4,
                logprob_threshold: -1.0
            };

            const command = this.buildTranscriptionCommand(wavFile, transcriptionOptions);
            LogService.info('Starting transcription:', { userId, command });

            const { stdout, stderr } = await execAsync(command);
            const results = await this.processTranscriptionResults(wavFile);
            const processingTime = Date.now() - startTime;
            
            return {
                text: results.text,
                segments: results.segments,
                language: results.language,
                confidence: this.calculateConfidence(results.segments),
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
            await this.cleanup(wavFile);
        }
    }

    buildTranscriptionCommand(inputFile, options) {
        const commandParts = [
            'whisper',
            `"${inputFile}"`,
            `--model ${options.model}`,
            `--language ${options.language}`,
            `--device ${options.device}`,
            '--output_format ' + options.outputFormats.join(','),
            '--word_timestamps True',
            `--temperature ${options.temperature}`,
            `--best_of ${options.bestOf}`,
            `--beam_size ${options.beamSize}`,
            '--condition_on_previous_text True',
            `--no_speech_threshold ${options.no_speech_threshold}`,
            `--compression_ratio_threshold ${options.compression_ratio_threshold}`,
            `--logprob_threshold ${options.logprob_threshold}`,
            `--output_dir "${this.config.tempPath}"`,
            '--verbose False',
            `--initial_prompt "${options.initial_prompt}"`
        ];

        return commandParts.join(' ');
    }

    async convertToWav(inputFile) {
        try {
            const outputFile = path.join(
                this.config.tempPath,
                `${path.basename(inputFile, path.extname(inputFile))}.wav`
            );
    
            // Commande ffmpeg améliorée pour une meilleure qualité audio
            const command = `ffmpeg -i "${inputFile}" \
                -ar 16000 \
                -ac 1 \
                -c:a pcm_s16le \
                -vn \
                -af "volume=1.5, \
                    highpass=f=50, \
                    lowpass=f=8000, \
                    arnndn=m=/path/to/noise-model, \
                    areverse,silenceremove=start_periods=1:start_duration=0.1:start_threshold=-50dB,areverse, \
                    loudnorm=I=-16:LRA=11:TP=-1.5" \
                -y "${outputFile}"`;
    
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

    calculateConfidence(segments) {
        if (!segments || segments.length === 0) return null;
        
        // Calcul amélioré de la confiance basé sur tous les segments
        const confidences = segments
            .filter(s => typeof s.confidence === 'number')
            .map(s => s.confidence);

        if (confidences.length === 0) return null;

        // Moyenne pondérée par la longueur des segments
        const totalWeight = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
        const weightedConfidence = segments.reduce((sum, s) => {
            const weight = (s.end - s.start) / totalWeight;
            return sum + (s.confidence || 0) * weight;
        }, 0);

        return Number(weightedConfidence.toFixed(4));
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