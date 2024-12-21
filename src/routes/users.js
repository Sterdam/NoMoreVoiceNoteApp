// src/routes/users.js
const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middlewares/auth');
const User = require('../models/User');
const LogService = require('../services/LogService');
const WhatsAppService = require('../services/WhatsAppService');

// Obtenir le profil de l'utilisateur
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password -encryptionKey');
        res.json(user);
    } catch (error) {
        LogService.error('Error fetching profile:', { userId: req.user._id, error });
        res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
});

// Mettre à jour le profil
router.patch('/profile', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['email', 'password', 'settings'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).json({ error: 'Mises à jour invalides' });
    }

    try {
        const user = req.user;

        updates.forEach(update => {
            if (update === 'email') {
                user.email = req.body.email.toLowerCase();
            } else {
                user[update] = req.body[update];
            }
        });

        await user.save();

        res.json({
            message: 'Profil mis à jour avec succès',
            user: {
                id: user._id,
                email: user.email,
                whatsappNumber: user.whatsappNumber,
                settings: user.settings
            }
        });
    } catch (error) {
        LogService.error('Error updating profile:', { userId: req.user._id, error });
        res.status(400).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
});

// Statut de la connexion WhatsApp
router.get('/whatsapp-status', auth, async (req, res) => {
    try {
        const isConnected = await WhatsAppService.isConnected(req.user._id);
        res.json({ connected: isConnected });
    } catch (error) {
        LogService.error('Error checking WhatsApp status:', { userId: req.user._id, error });
        res.status(500).json({ error: 'Erreur lors de la vérification du statut WhatsApp' });
    }
});

// Déconnexion de WhatsApp
router.post('/whatsapp-logout', auth, async (req, res) => {
    try {
        await WhatsAppService.logout(req.user._id);
        res.json({ message: 'Déconnecté de WhatsApp avec succès' });
    } catch (error) {
        LogService.error('Error logging out of WhatsApp:', { userId: req.user._id, error });
        res.status(500).json({ error: 'Erreur lors de la déconnexion de WhatsApp' });
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
        res.status(500).json({ error: 'Erreur lors de la récupération de la liste des utilisateurs' });
    }
});

module.exports = router;