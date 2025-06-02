// src/routes/users.js
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middlewares/auth');
const User = require('../models/User');
const LogService = require('../services/LogService');
const WhatsAppService = require('../services/WhatsAppService');
const NotificationService = require('../services/NotificationsService');
const { t } = require('../utils/translate');
const Subscription = require('../models/Subscription');

// Obtenir le profil de l'utilisateur
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password -encryptionKey');
        res.json(user);
    } catch (error) {
        LogService.error('Error fetching profile:', { userId: req.user._id, error });
        res.status(500).json({ error: t('users.profile.fetch_error', req) });
    }
});

// Mettre à jour le profil
router.patch('/profile', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['email', 'password', 'settings'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).json({ error: t('users.profile.invalid_updates', req) });
    }

    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({ error: t('users.profile.user_not_found', req) });
        }

        updates.forEach(async update => {
            if (update === 'email') {
                user.email = req.body.email.toLowerCase();
            } else if (update === 'settings') {
                // Fusionner les nouveaux settings avec les anciens
                user.settings = {
                    ...user.settings,
                    ...req.body.settings
                };
                
                // Validation des settings
                if (req.body.settings.summaryLevel) {
                    const validLevels = ['none', 'concise', 'detailed'];
                    if (!validLevels.includes(req.body.settings.summaryLevel)) {
                        throw new Error('Invalid summary level');
                    }
                }
                
                if (req.body.settings.transcriptionLanguage) {
                    const validLanguages = ['auto', 'fr', 'en', 'es', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh'];
                    if (!validLanguages.includes(req.body.settings.transcriptionLanguage)) {
                        throw new Error('Invalid transcription language');
                    }
                }
                
                if (req.body.settings.summaryLanguage) {
                    const validSummaryLanguages = ['same', 'fr', 'en', 'es', 'de', 'it', 'pt'];
                    if (!validSummaryLanguages.includes(req.body.settings.summaryLanguage)) {
                        throw new Error('Invalid summary language');
                    }
                }
                
                // Vérifier les droits pour certaines fonctionnalités
                if (req.body.settings.separateConversation || req.body.settings.summaryLevel !== 'none') {
                    const subscription = await Subscription.findOne({ userId: user._id });
                    if (!subscription || subscription.plan === 'trial') {
                        return res.status(403).json({ 
                            error: t('users.profile.pro_feature_required', req) 
                        });
                    }
                }
            } else {
                user[update] = req.body[update];
            }
        });

        await user.save();

        LogService.info('User profile updated', {
            userId: user._id,
            updates: updates.filter(u => u !== 'password')
        });

        res.json({
            message: t('users.profile.update_success', req),
            user: {
                id: user._id,
                email: user.email,
                whatsappNumber: user.whatsappNumber,
                settings: user.settings
            }
        });
    } catch (error) {
        LogService.error('Error updating profile:', { 
            userId: req.user._id, 
            error: error.message 
        });
        
        if (error.message.includes('Invalid')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(400).json({ error: t('users.profile.update_error', req) });
    }
});

// Statut de la connexion WhatsApp
router.get('/whatsapp-status', auth, async (req, res) => {
    try {
        const isConnected = await WhatsAppService.isConnected(req.user._id);
        res.json({ connected: isConnected });
    } catch (error) {
        LogService.error('Error checking WhatsApp status:', { userId: req.user._id, error });
        res.status(500).json({ error: t('users.whatsapp.status_check_error', req) });
    }
});

// Déconnexion de WhatsApp
router.post('/whatsapp-logout', auth, async (req, res) => {
    try {
        await WhatsAppService.logout(req.user._id);
        res.json({ message: t('users.whatsapp.logout_success', req) });
    } catch (error) {
        LogService.error('Error logging out of WhatsApp:', { userId: req.user._id, error });
        res.status(500).json({ error: t('users.whatsapp.logout_error', req) });
    }
});

// Route administrateur : liste des utilisateurs
router.get('/list', auth, authorize(['admin']), async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password -encryptionKey')
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        LogService.error('Error fetching users list:', { error });
        res.status(500).json({ error: t('users.list.fetch_error', req) });
    }
});

// Route de test pour les notifications (dev only)
if (process.env.NODE_ENV === 'development') {
    router.post('/test-notifications', auth, async (req, res) => {
        try {
            const { type } = req.body;
            
            switch (type) {
                case 'welcome':
                    await NotificationService.sendWelcomeEmail(req.user);
                    break;
                case 'quota-warning':
                    await NotificationService.checkAndNotifyQuotaUsage(req.user._id);
                    break;
                case 'custom':
                    await NotificationService.sendCustomNotification(req.user._id, {
                        email: {
                            subject: 'Test Email',
                            html: '<h1>Test Email</h1><p>This is a test.</p>'
                        },
                        whatsapp: '🧪 Ceci est un message de test'
                    });
                    break;
            }
            
            res.json({ message: 'Notification sent' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

module.exports = router;