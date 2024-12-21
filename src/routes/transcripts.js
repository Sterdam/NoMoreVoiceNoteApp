const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const WhatsAppService = require('../services/WhatsAppService');
const LogService = require('../services/LogService');
const { Transcript } = require('../models/Transcript');

// Important : les routes spécifiques doivent être AVANT les routes avec paramètres

// Obtenir le QR code pour la connexion WhatsApp
router.get('/whatsapp-qr', auth, async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: 'Utilisateur non authentifié' });
        }

        const userId = req.user._id.toString();
        
        // Vérifier d'abord si WhatsApp est déjà connecté
        const isConnected = await WhatsAppService.isConnected(userId);
        if (isConnected) {
            return res.json({ status: 'connected' });
        }

        // Si pas connecté, obtenir ou générer un QR code
        const qr = await WhatsAppService.getQRCode(userId);
        
        if (!qr) {
            return res.status(202).json({
                status: 'pending',
                message: 'QR code en cours de génération'
            });
        }

        res.json({ status: 'pending', qr });
    } catch (error) {
        LogService.error('Error in whatsapp-qr route:', {
            userId: req.user?._id,
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: 'Erreur lors de la génération du QR code',
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
        res.status(500).json({ error: 'Erreur lors de la vérification du statut WhatsApp' });
    }
});

// Obtenir toutes les transcriptions de l'utilisateur
router.get('/', auth, async (req, res) => {
    try {
        const transcripts = await Transcript.find({ userId: req.user._id })
            .sort({ createdAt: -1 });
        res.json(transcripts);
    } catch (error) {
        LogService.error('Error fetching transcripts:', { userId: req.user._id, error: error.message });
        res.status(500).json({ error: 'Erreur lors de la récupération des transcriptions' });
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
            return res.status(404).json({ error: 'Transcription non trouvée' });
        }

        res.json(transcript);
    } catch (error) {
        LogService.error('Error fetching transcript:', {
            userId: req.user._id,
            transcriptId: req.params.id,
            error: error.message
        });
        res.status(500).json({ error: 'Erreur lors de la récupération de la transcription' });
    }
});

module.exports = router;