// src/services/QueueService.js
const Bull = require('bull');
const LogService = require('./LogService');
const OpenAIService = require('./OpenAIService');
const os = require('os');

class QueueService {
    constructor() {
        // File d'attente principale pour les transcriptions
        this.transcriptionQueue = new Bull('transcriptions', {
            redis: process.env.REDIS_URL,
            defaultJobOptions: {
                removeOnComplete: 100, // Garde les 100 derniers jobs complétés
                removeOnFail: 50, // Garde les 50 derniers jobs échoués
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            }
        });

        // File d'attente prioritaire pour les utilisateurs premium
        this.priorityQueue = new Bull('priority-transcriptions', {
            redis: process.env.REDIS_URL,
            defaultJobOptions: {
                priority: 1,
                removeOnComplete: 50,
                removeOnFail: 25
            }
        });

        // Métriques
        this.metrics = {
            processed: 0,
            failed: 0,
            waiting: 0,
            active: 0
        };

        this.setupQueues();
        this.setupMetricsCollection();
    }

    async setupQueues() {
        // Configuration des événements pour les deux files
        [this.transcriptionQueue, this.priorityQueue].forEach(queue => {
            queue.on('error', (error) => {
                LogService.error(`Queue error (${queue.name}):`, error);
            });

            queue.on('waiting', (jobId) => {
                this.metrics.waiting++;
                LogService.debug(`Job waiting (${queue.name}):`, { jobId });
            });

            queue.on('active', (job) => {
                this.metrics.active++;
                this.metrics.waiting = Math.max(0, this.metrics.waiting - 1);
                LogService.info(`Job started (${queue.name}):`, { 
                    jobId: job.id, 
                    attempts: job.attemptsMade 
                });
            });

            queue.on('completed', (job, result) => {
                this.metrics.processed++;
                this.metrics.active = Math.max(0, this.metrics.active - 1);
                LogService.info(`Job completed (${queue.name}):`, { 
                    jobId: job.id,
                    duration: Date.now() - job.timestamp 
                });
            });

            queue.on('failed', (job, error) => {
                this.metrics.failed++;
                this.metrics.active = Math.max(0, this.metrics.active - 1);
                LogService.error(`Job failed (${queue.name}):`, { 
                    jobId: job.id, 
                    error: error.message,
                    attempts: job.attemptsMade 
                });
            });

            queue.on('stalled', (job) => {
                LogService.warn(`Job stalled (${queue.name}):`, { jobId: job.id });
            });
        });

        // Nombre de workers basé sur les CPU disponibles
        const concurrency = Math.max(1, os.cpus().length - 1);

        // Traitement des jobs normaux
        this.transcriptionQueue.process(concurrency, async (job) => {
            return this.processTranscription(job);
        });

        // Traitement des jobs prioritaires avec plus de workers
        this.priorityQueue.process(concurrency * 2, async (job) => {
            return this.processTranscription(job);
        });
    }

    async processTranscription(job) {
        const { userId, filePath, messageId, language, autoSummarize } = job.data;
        const startTime = Date.now();
        
        try {
            LogService.info('Processing transcription:', { 
                jobId: job.id, 
                userId,
                attempt: job.attemptsMade + 1 
            });

            // Vérification de la santé du système
            const memoryUsage = process.memoryUsage();
            if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
                throw new Error('Memory usage too high');
            }

            // Mise à jour du progrès
            await job.progress(10);

            // Transcription avec OpenAI
            const transcriptionResult = await OpenAIService.transcribe(filePath, {
                language,
                model: 'whisper-1',
                response_format: 'json'
            });

            await job.progress(60);

            // Validation du résultat
            if (!transcriptionResult || !transcriptionResult.text) {
                throw new Error('Invalid transcription result');
            }

            let result = {
                text: transcriptionResult.text,
                language: transcriptionResult.language,
                duration: transcriptionResult.duration
            };

            // Génération du résumé si demandé
            if (autoSummarize) {
                await job.progress(70);
                try {
                    const summary = await OpenAIService.summarize(transcriptionResult.text, {
                        language: transcriptionResult.language,
                        maxTokens: 150
                    });
                    result.summary = summary;
                } catch (summaryError) {
                    LogService.warn('Summary generation failed:', summaryError);
                    // Continue sans le résumé
                }
            }

            await job.progress(100);

            // Métriques de performance
            const duration = Date.now() - startTime;
            LogService.info('Transcription completed:', {
                jobId: job.id,
                duration,
                textLength: result.text.length,
                hasSummary: !!result.summary
            });

            return {
                ...result,
                processingTime: duration,
                jobId: job.id
            };

        } catch (error) {
            LogService.error('Transcription processing error:', { 
                jobId: job.id, 
                error: error.message,
                stack: error.stack,
                attempt: job.attemptsMade + 1
            });
            
            // Re-throw avec plus de contexte
            error.jobId = job.id;
            error.userId = userId;
            throw error;
        }
    }

    async addTranscriptionJob(data, options = {}) {
        try {
            const { priority = false, delay = 0 } = options;
            
            // Validation des données
            if (!data.userId || !data.filePath) {
                throw new Error('Missing required job data');
            }

            // Choisir la queue appropriée
            const queue = priority ? this.priorityQueue : this.transcriptionQueue;
            
            const jobOptions = {
                delay,
                priority: priority ? 1 : 0,
                attempts: priority ? 5 : 3,
                backoff: {
                    type: 'exponential',
                    delay: priority ? 1000 : 2000
                },
                timeout: 300000 // 5 minutes
            };

            const job = await queue.add(data, jobOptions);

            LogService.info('Job added to queue:', { 
                jobId: job.id, 
                userId: data.userId,
                queue: queue.name,
                priority 
            });
            
            return {
                id: job.id,
                queue: queue.name,
                status: 'queued'
            };
        } catch (error) {
            LogService.error('Error adding job to queue:', error);
            throw error;
        }
    }

    async getJobStatus(jobId) {
        try {
            // Chercher dans les deux queues
            let job = await this.transcriptionQueue.getJob(jobId);
            if (!job) {
                job = await this.priorityQueue.getJob(jobId);
            }
            
            if (!job) {
                return null;
            }

            const state = await job.getState();
            const progress = job.progress();

            return {
                id: job.id,
                state,
                progress,
                data: job.data,
                failedReason: job.failedReason,
                finishedOn: job.finishedOn,
                processedOn: job.processedOn
            };
        } catch (error) {
            LogService.error('Error getting job status:', { jobId, error });
            throw error;
        }
    }

    async getActiveJobs() {
        try {
            const normalActive = await this.transcriptionQueue.getActive();
            const priorityActive = await this.priorityQueue.getActive();
            return [...priorityActive, ...normalActive];
        } catch (error) {
            LogService.error('Error getting active jobs:', error);
            throw error;
        }
    }

    async getWaitingJobs() {
        try {
            const normalWaiting = await this.transcriptionQueue.getWaiting();
            const priorityWaiting = await this.priorityQueue.getWaiting();
            return [...priorityWaiting, ...normalWaiting];
        } catch (error) {
            LogService.error('Error getting waiting jobs:', error);
            throw error;
        }
    }

    async getQueueMetrics() {
        try {
            const [normalCounts, priorityCounts] = await Promise.all([
                this.transcriptionQueue.getJobCounts(),
                this.priorityQueue.getJobCounts()
            ]);

            return {
                normal: normalCounts,
                priority: priorityCounts,
                totals: {
                    waiting: normalCounts.waiting + priorityCounts.waiting,
                    active: normalCounts.active + priorityCounts.active,
                    completed: normalCounts.completed + priorityCounts.completed,
                    failed: normalCounts.failed + priorityCounts.failed,
                    delayed: normalCounts.delayed + priorityCounts.delayed
                },
                performance: this.metrics,
                health: {
                    isHealthy: this.isHealthy(),
                    memoryUsage: process.memoryUsage(),
                    uptime: process.uptime()
                }
            };
        } catch (error) {
            LogService.error('Error getting queue metrics:', error);
            throw error;
        }
    }

    async clearFailedJobs(age = 3600000) { // 1 heure par défaut
        try {
            await Promise.all([
                this.transcriptionQueue.clean(age, 'failed'),
                this.priorityQueue.clean(age, 'failed')
            ]);
            LogService.info('Failed jobs cleared', { age });
        } catch (error) {
            LogService.error('Error clearing failed jobs:', error);
            throw error;
        }
    }

    async pauseQueue(queueName) {
        try {
            const queue = queueName === 'priority' ? this.priorityQueue : this.transcriptionQueue;
            await queue.pause();
            LogService.info(`Queue paused: ${queueName}`);
        } catch (error) {
            LogService.error('Error pausing queue:', error);
            throw error;
        }
    }

    async resumeQueue(queueName) {
        try {
            const queue = queueName === 'priority' ? this.priorityQueue : this.transcriptionQueue;
            await queue.resume();
            LogService.info(`Queue resumed: ${queueName}`);
        } catch (error) {
            LogService.error('Error resuming queue:', error);
            throw error;
        }
    }

    setupMetricsCollection() {
        // Collecte des métriques toutes les 30 secondes
        setInterval(async () => {
            try {
                const metrics = await this.getQueueMetrics();
                LogService.debug('Queue metrics:', metrics);
            } catch (error) {
                LogService.error('Error collecting metrics:', error);
            }
        }, 30000);
    }

    isHealthy() {
        const memUsage = process.memoryUsage();
        const heapPercentage = memUsage.heapUsed / memUsage.heapTotal;
        return heapPercentage < 0.85 && this.metrics.failed < 100;
    }

    async gracefulShutdown() {
        LogService.info('Shutting down queue service...');
        await Promise.all([
            this.transcriptionQueue.close(),
            this.priorityQueue.close()
        ]);
    }
}

module.exports = new QueueService();