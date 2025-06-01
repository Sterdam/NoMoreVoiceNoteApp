// src/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middlewares/auth');
const LogService = require('../services/LogService');
const { validate, registrationValidation, loginValidation } = require('../middlewares/validation');

// Inscription
router.post('/register', validate(registrationValidation), async (req, res) => {
    try {
        const { email, password, whatsappNumber } = req.body;

        LogService.info('Tentative d\'inscription:', { email, whatsappNumber });

        // Les validations sont déjà effectuées par le middleware

        // Création de l'utilisateur
        const user = new User({
            email: email.toLowerCase(),
            password,
            whatsappNumber
        });

        await user.save();
        const token = user.generateAuthToken();

        // Configuration des cookies
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 heures
        });

        LogService.info('Inscription réussie:', { userId: user._id, email: user.email });

        res.status(201).json({
            message: 'Inscription réussie',
            user: {
                id: user._id,
                email: user.email,
                whatsappNumber: user.whatsappNumber
            },
            token
        });
    } catch (error) {
        LogService.error('Erreur lors de l\'inscription:', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });
        
        res.status(500).json({
            error: 'Erreur lors de l\'inscription. Veuillez réessayer.'
        });
    }
});

// Connexion
router.post('/login', validate(loginValidation), async (req, res) => {
    try {
        const { email, password } = req.body;

        LogService.info('Tentative de connexion:', { email });

        // Les validations sont déjà effectuées par le middleware

        const user = await User.findByCredentials(email.toLowerCase(), password);
        const token = user.generateAuthToken();

        // Mise à jour de la dernière connexion
        user.lastLogin = new Date();
        await user.save();

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        LogService.info('Connexion réussie:', { userId: user._id, email: user.email });

        res.json({
            message: 'Connexion réussie',
            user: {
                id: user._id,
                email: user.email,
                whatsappNumber: user.whatsappNumber
            },
            token
        });
    } catch (error) {
        LogService.warn('Connexion échouée:', {
            email: req.body.email,
            error: error.message
        });
        
        res.status(401).json({
            error: 'Email ou mot de passe incorrect'
        });
    }
});

// Déconnexion
router.post('/logout', auth, async (req, res) => {
    try {
        res.clearCookie('token');
        LogService.info('Déconnexion réussie:', { userId: req.user._id });
        res.json({ message: 'Déconnexion réussie' });
    } catch (error) {
        LogService.error('Erreur lors de la déconnexion:', {
            userId: req.user._id,
            error: error.message
        });
        res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
});

module.exports = router;