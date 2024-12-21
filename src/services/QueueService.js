// src/services/QueueService.js
const Bull = require('bull');
const Redis = require('ioredis');
const LogService = require('./LogService');
const WhisperService = require('./WhisperService');

class QueueService {
    constructor() {
        // File d'attente principale pour les transcriptions
        this.transcriptionQueue = new Bull('transcriptions', {
            redis: process.env.REDIS_URL,
            limiter: {
                max: 5, // Nombre maximum de jobs simultanés
                duration: 1000 * 60 // Par minute
            }
        });

        this.setupQueues();
    }

    async setupQueues() {
        // Configuration des événements de la file d'attente
        this.transcriptionQueue.on('error', (error) => {
            LogService.error('Queue error:', error);
        });

        this.transcriptionQueue.on('waiting', (jobId) => {
            LogService.info('Job waiting:', { jobId });
        });

        this.transcriptionQueue.on('active', (job) => {
            LogService.info('Job started:', { jobId: job.id });
        });

        this.transcriptionQueue.on('completed', (job, result) => {
            LogService.info('Job completed:', { jobId: job.id });
        });

        this.transcriptionQueue.on('failed', (job, error) => {
            LogService.error('Job failed:', { jobId: job.id, error });
        });

        // Traitement des jobs de transcription
        this.transcriptionQueue.process(async (job) => {
            const { userId, filePath, messageId } = job.data;
            
            try {
                LogService.info('Processing transcription:', { jobId: job.id, userId });

                // Mise à jour du progrès
                await job.progress(10);

                // Transcription avec Whisper
                const result = await WhisperService.transcribe(filePath, userId);

                await job.progress(100);

                // Retourner le résultat
                return result;

            } catch (error) {
                LogService.error('Transcription processing error:', { jobId: job.id, error });
                throw error;
            }
        });
    }

    async addTranscriptionJob(data) {
        try {
            const job = await this.transcriptionQueue.add(data, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                },
                removeOnComplete: true,
                removeOnFail: false
            });

            LogService.info('Job added to queue:', { jobId: job.id, userId: data.userId });
            return job;
        } catch (error) {
            LogService.error('Error adding job to queue:', error);
            throw error;
        }
    }

    async getJobStatus(jobId) {
        try {
            const job = await this.transcriptionQueue.getJob(jobId);
            if (!job) {
                return null;
            }

            const state = await job.getState();
            const progress = await job.progress();

            return {
                id: job.id,
                state,
                progress,
                data: job.data,
                failedReason: job.failedReason
            };
        } catch (error) {
            LogService.error('Error getting job status:', { jobId, error });
            throw error;
        }
    }

    async getActiveJobs() {
        try {
            return await this.transcriptionQueue.getActive();
        } catch (error) {
            LogService.error('Error getting active jobs:', error);
            throw error;
        }
    }

    async getWaitingJobs() {
        try {
            return await this.transcriptionQueue.getWaiting();
        } catch (error) {
            LogService.error('Error getting waiting jobs:', error);
            throw error;
        }
    }

    async clearFailedJobs() {
        try {
            await this.transcriptionQueue.clean(10000, 'failed');
            LogService.info('Failed jobs cleared');
        } catch (error) {
            LogService.error('Error clearing failed jobs:', error);
            throw error;
        }
    }
}

module.exports = new QueueService();