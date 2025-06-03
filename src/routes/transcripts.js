const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const WhatsAppService = require('../services/WhatsAppService');
const LogService = require('../services/LogService');
const Transcript = require('../models/Transcript');
const QueueService = require('../services/QueueService');
const Usage = require('../models/Usage');
const Subscription = require('../models/Subscription');
const { transcriptionLimiter } = require('../middlewares/rateLimit');
const { 
    addLegalDisclaimers, 
    validateLegalConsent, 
    validateContentCompliance, 
    auditLog 
} = require('../middlewares/legal');
const { t } = require('../utils/translate');

// Important : les routes spécifiques doivent être AVANT les routes avec paramètres

// Middleware pour vérifier les limites du plan
const checkPlanLimits = async (req, res, next) => {
    try {
        const userId = req.user._id;
        
        // Récupérer l'abonnement actuel
        const subscription = await Subscription.findOne({ 
            userId, 
            status: 'active' 
        });
        
        const plan = subscription?.plan || 'free';
        
        // Récupérer l'utilisation du mois en cours
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const usage = await Usage.findOne({
            userId,
            month: startOfMonth
        });
        
        const currentUsage = usage?.transcriptions?.count || 0;
        
        // Limites par plan
        const limits = {
            free: 10,
            basic: 100,
            premium: 1000,
            enterprise: Infinity
        };
        
        if (currentUsage >= limits[plan]) {
            return res.status(429).json({ 
                error: t('transcripts.limits.monthly_limit_reached', req),
                limit: limits[plan],
                current: currentUsage,
                plan
            });
        }
        
        req.userPlan = plan;
        req.isPremium = ['premium', 'enterprise'].includes(plan);
        next();
    } catch (error) {
        LogService.error('Error checking plan limits:', error);
        next(error);
    }
};

// Obtenir le QR code pour la connexion WhatsApp
router.get('/whatsapp-qr', auth, async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: t('auth.user_not_authenticated', req) });
        }

        const userId = req.user._id.toString();
        
        // Vérifier d'abord si WhatsApp est déjà connecté
        const isConnected = await WhatsAppService.isConnected(userId);
        if (isConnected) {
            return res.json({ status: 'connected' });
        }

        // Si pas connecté, obtenir ou générer un QR code
        const qrResult = await WhatsAppService.getQRCode(userId);
        
        if (!qrResult) {
            return res.status(202).json({
                status: 'pending',
                message: t('transcripts.whatsapp.qr_generating', req)
            });
        }

        // Retourner directement le résultat de getQRCode
        res.json(qrResult);
    } catch (error) {
        LogService.error('Error in whatsapp-qr route:', {
            userId: req.user?._id,
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: t('transcripts.whatsapp.qr_generation_error', req),
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Vérifier le statut de WhatsApp
router.get('/whatsapp-status', auth, async (req, res) => {
    try {
        const isConnected = await WhatsAppService.isConnected(req.user._id);
        res.json({ connected: isConnected });
    } catch (error) {
        LogService.error('Error checking WhatsApp status:', {
            userId: req.user._id,
            error: error.message
        });
        res.status(500).json({ error: t('transcripts.whatsapp.status_check_error', req) });
    }
});

// Créer une nouvelle transcription (via upload ou WhatsApp)
router.post('/transcribe', 
    auth, 
    validateLegalConsent,
    validateContentCompliance,
    process.env.NODE_ENV !== 'development' ? transcriptionLimiter : (req, res, next) => next(), 
    checkPlanLimits, 
    auditLog('transcription_request'),
    addLegalDisclaimers('transcription'),
    async (req, res) => {
    try {
        const { filePath, language = 'auto', autoSummarize = false, messageId } = req.body;
        
        if (!filePath) {
            return res.status(400).json({ error: t('transcripts.errors.missing_file_path', req) });
        }
        
        // Ajouter le job à la queue
        const jobInfo = await QueueService.addTranscriptionJob({
            userId: req.user._id.toString(),
            filePath,
            messageId,
            language,
            autoSummarize,
            plan: req.userPlan
        }, {
            priority: req.isPremium // Les utilisateurs premium sont prioritaires
        });
        
        // Mettre à jour le compteur d'utilisation
        await Usage.findOneAndUpdate(
            { 
                userId: req.user._id, 
                month: new Date(new Date().setDate(1)).setHours(0, 0, 0, 0) 
            },
            { 
                $inc: { transcriptionCount: 1 },
                $set: { lastUsed: new Date() }
            },
            { upsert: true }
        );
        
        res.status(202).json({
            message: t('transcripts.transcription.processing', req),
            jobId: jobInfo.id,
            queue: jobInfo.queue,
            status: jobInfo.status
        });
        
    } catch (error) {
        LogService.error('Error creating transcription job:', { 
            userId: req.user._id, 
            error: error.message 
        });
        res.status(500).json({ 
            error: t('transcripts.errors.transcription_start_error', req),
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Vérifier le statut d'un job de transcription
router.get('/job/:jobId', auth, async (req, res) => {
    try {
        const jobStatus = await QueueService.getJobStatus(req.params.jobId);
        
        if (!jobStatus) {
            return res.status(404).json({ error: t('transcripts.errors.job_not_found', req) });
        }
        
        // Vérifier que le job appartient à l'utilisateur
        if (jobStatus.data.userId !== req.user._id.toString()) {
            return res.status(403).json({ error: t('auth.unauthorized_access', req) });
        }
        
        res.json(jobStatus);
    } catch (error) {
        LogService.error('Error getting job status:', { 
            jobId: req.params.jobId, 
            error: error.message 
        });
        res.status(500).json({ error: t('transcripts.errors.status_fetch_error', req) });
    }
});

// Obtenir les métriques de la queue (admin only)
router.get('/queue/metrics', auth, async (req, res) => {
    try {
        // Vérifier les droits admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: t('auth.admin_only', req) });
        }
        
        const metrics = await QueueService.getQueueMetrics();
        res.json(metrics);
    } catch (error) {
        LogService.error('Error getting queue metrics:', error);
        res.status(500).json({ error: t('transcripts.errors.metrics_fetch_error', req) });
    }
});

// Obtenir toutes les transcriptions de l'utilisateur
router.get('/', auth, async (req, res) => {
    try {
        const { limit = 50, skip = 0, status } = req.query;
        
        const query = { userId: req.user._id };
        if (status) {
            query.status = status;
        }
        
        const [transcripts, total] = await Promise.all([
            Transcript.find(query)
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(parseInt(skip))
                .select('-audioData'), // Exclure les données audio pour performance
            Transcript.countDocuments(query)
        ]);
        
        res.json({
            transcripts,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: skip + limit < total
            }
        });
    } catch (error) {
        LogService.error('Error fetching transcripts:', { 
            userId: req.user._id, 
            error: error.message 
        });
        res.status(500).json({ error: t('transcripts.errors.fetch_error', req) });
    }
});

// Supprimer une transcription
router.delete('/:id', auth, async (req, res) => {
    try {
        const transcript = await Transcript.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!transcript) {
            return res.status(404).json({ error: t('transcripts.errors.not_found', req) });
        }

        res.json({ message: t('transcripts.delete.success', req) });
    } catch (error) {
        LogService.error('Error deleting transcript:', {
            userId: req.user._id,
            transcriptId: req.params.id,
            error: error.message
        });
        res.status(500).json({ error: t('transcripts.errors.delete_error', req) });
    }
});

// Cette route doit être en DERNIER car elle contient un paramètre
// Obtenir une transcription spécifique
router.get('/:id', auth, async (req, res) => {
    try {
        const transcript = await Transcript.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!transcript) {
            return res.status(404).json({ error: t('transcripts.errors.not_found', req) });
        }

        res.json(transcript);
    } catch (error) {
        LogService.error('Error fetching transcript:', {
            userId: req.user._id,
            transcriptId: req.params.id,
            error: error.message
        });
        res.status(500).json({ error: t('transcripts.errors.fetch_single_error', req) });
    }
});

module.exports = router;