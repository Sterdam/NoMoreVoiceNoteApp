const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middlewares/auth');
const LogService = require('../services/LogService');
const NotificationService = require('../services/NotificationsService');
const { validate, registrationValidation, loginValidation } = require('../middlewares/validation');
const { t } = require('../utils/translate');

// Chargement des modèles avec gestion d'erreur
let User, Subscription;
try {
    User = require('../models/User');
    Subscription = require('../models/Subscription');
} catch (error) {
    LogService.error('Erreur lors du chargement des modèles:', {
        error: error.message,
        stack: error.stack
    });
    throw error;
}

// Wrapper pour gérer les erreurs async
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Inscription avec transaction
router.post('/register', validate(registrationValidation), asyncHandler(async (req, res) => {
    // Vérifier la connexion MongoDB
    if (mongoose.connection.readyState !== 1) {
        LogService.error('MongoDB non connecté', { 
            readyState: mongoose.connection.readyState,
            states: { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
        });
        return res.status(503).json({
            error: t('errors.serviceUnavailable', req)
        });
    }
    
    // En développement, pas de transactions (MongoDB standalone)
    const useTransaction = process.env.NODE_ENV === 'production';
    const session = useTransaction ? await mongoose.startSession() : null;
    
    try {
        const { email, password, whatsappNumber } = req.body;

        LogService.info('Tentative d\'inscription:', { 
            email: email.toLowerCase(),
            whatsappNumber: whatsappNumber,
            requestBody: req.body,
            headers: req.headers
        });

        // Démarrer la transaction si en production
        if (useTransaction) {
            await session.startTransaction();
        }

        // Vérifier si l'utilisateur existe déjà
        LogService.info('Vérification de l\'existence de l\'utilisateur...');
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { whatsappNumber: whatsappNumber }
            ]
        }).session(useTransaction ? session : undefined);
        
        LogService.info('Résultat de la vérification:', { 
            userExists: !!existingUser,
            existingEmail: existingUser?.email
        });

        if (existingUser) {
            if (useTransaction) {
                await session.abortTransaction();
            }
            return res.status(400).json({
                error: existingUser.email === email.toLowerCase() 
                    ? t('errors.emailAlreadyUsed', req)
                    : t('errors.whatsappAlreadyUsed', req)
            });
        }

        // Créer l'utilisateur
        const userData = {
            email: email.toLowerCase(),
            password,
            whatsappNumber
        };

        LogService.info('Création de l\'utilisateur avec les données:', { 
            email: userData.email,
            whatsappNumber: userData.whatsappNumber
        });
        
        let user;
        try {
            user = new User(userData);
            LogService.info('Objet User créé avec succès');
        } catch (createError) {
            LogService.error('Erreur lors de la création de l\'objet User:', {
                error: createError.message,
                stack: createError.stack,
                userData
            });
            throw createError;
        }
        
        try {
            await user.save(useTransaction ? { session } : {});
            LogService.info('Utilisateur sauvegardé avec succès');
        } catch (saveError) {
            LogService.error('Erreur lors de la sauvegarde de l\'utilisateur:', {
                error: saveError.message,
                code: saveError.code,
                name: saveError.name,
                stack: saveError.stack
            });
            throw saveError;
        }

        LogService.info('Utilisateur créé avec succès:', { 
            userId: user._id,
            email: user.email 
        });

        // Créer l'abonnement trial
        const subscriptionData = {
            userId: user._id,
            plan: 'trial',
            status: 'active',
            limits: {
                minutesPerMonth: 10,
                summariesPerMonth: 10,
                maxAudioDuration: 180
            },
            features: {
                transcription: true,
                summary: true,
                multiLanguage: false,
                priority: false,
                apiAccess: false
            }
        };

        const subscription = new Subscription(subscriptionData);
        
        try {
            await subscription.save(useTransaction ? { session } : {});
            LogService.info('Abonnement sauvegardé avec succès');
        } catch (subError) {
            LogService.error('Erreur lors de la sauvegarde de l\'abonnement:', {
                error: subError.message,
                code: subError.code,
                name: subError.name,
                stack: subError.stack
            });
            throw subError;
        }

        LogService.info('Abonnement trial créé:', { 
            subscriptionId: subscription._id,
            userId: user._id 
        });

        // Confirmer la transaction si en production
        if (useTransaction) {
            await session.commitTransaction();
        }

        // Générer le token après la transaction
        const token = user.generateAuthToken();

        // Configuration des cookies sécurisés
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 24 heures
            path: '/'
        };

        res.cookie('token', token, cookieOptions);

        LogService.info('Inscription réussie:', { 
            userId: user._id, 
            email: user.email 
        });

        // Réponse de succès
        res.status(201).json({
            success: true,
            message: t('success.registrationSuccess', req),
            user: {
                id: user._id,
                email: user.email,
                whatsappNumber: user.whatsappNumber,
                settings: user.settings,
                onboardingCompleted: user.onboardingCompleted
            },
            subscription: {
                plan: subscription.plan,
                status: subscription.status,
                trialEndDate: subscription.trialEndDate,
                limits: subscription.limits,
                features: subscription.features
            },
            token
        });

        // Envoyer l'email de bienvenue (non bloquant)
        NotificationService.sendWelcomeEmail(user).catch(error => {
            LogService.error('Failed to send welcome email:', error);
        });

    } catch (error) {
        // Annuler la transaction en cas d'erreur
        if (useTransaction && session && session.inTransaction()) {
            try {
                await session.abortTransaction();
            } catch (abortError) {
                LogService.error('Erreur lors de l\'annulation de la transaction:', {
                    error: abortError.message
                });
            }
        }
        
        LogService.error('Erreur lors de l\'inscription:', {
            error: error.message,
            stack: error.stack,
            code: error.code,
            name: error.name,
            email: req.body?.email,
            whatsappNumber: req.body?.whatsappNumber,
            mongooseConnection: mongoose.connection.readyState,
            errorDetails: error
        });

        // Gestion spécifique des erreurs MongoDB
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: t('errors.invalidData', req),
                details: errors
            });
        }

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0];
            return res.status(400).json({
                success: false,
                error: field === 'email' 
                    ? t('errors.emailAlreadyUsed', req)
                    : t('errors.whatsappAlreadyUsed', req)
            });
        }

        // Log plus détaillé pour le développement
        if (process.env.NODE_ENV === 'development') {
            return res.status(500).json({
                success: false,
                error: t('errors.internalServerError', req),
                details: error.message,
                stack: error.stack
            });
        }

        res.status(500).json({
            success: false,
            error: t('errors.internalServerErrorRetry', req)
        });

    } finally {
        if (useTransaction && session) {
            await session.endSession();
        }
    }
}));

// Connexion
router.post('/login', validate(loginValidation), async (req, res) => {
    try {
        const { email, password } = req.body;

        LogService.info('Tentative de connexion:', { email: email.toLowerCase() });

        const user = await User.findByCredentials(email, password);
        const token = user.generateAuthToken();

        // Mise à jour de la dernière connexion
        user.lastLogin = new Date();
        await user.save();

        // Configuration des cookies sécurisés
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        };

        res.cookie('token', token, cookieOptions);

        LogService.info('Connexion réussie:', { 
            userId: user._id, 
            email: user.email 
        });

        res.json({
            success: true,
            message: t('success.loginSuccess', req),
            user: {
                id: user._id,
                email: user.email,
                whatsappNumber: user.whatsappNumber,
                settings: user.settings,
                onboardingCompleted: user.onboardingCompleted,
                lastLogin: user.lastLogin
            },
            token
        });

    } catch (error) {
        LogService.warn('Connexion échouée:', {
            email: req.body?.email,
            error: error.message
        });
        
        res.status(401).json({
            success: false,
            error: t('errors.invalidCredentials', req)
        });
    }
});

// Déconnexion
router.post('/logout', auth, async (req, res) => {
    try {
        // Configuration des cookies pour la suppression
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            path: '/'
        };

        res.clearCookie('token', cookieOptions);
        
        LogService.info('Déconnexion réussie:', { userId: req.user._id });
        
        res.json({ 
            success: true,
            message: t('success.logoutSuccess', req) 
        });

    } catch (error) {
        LogService.error('Erreur lors de la déconnexion:', {
            userId: req.user?._id,
            error: error.message
        });
        
        res.status(500).json({ 
            success: false,
            error: t('errors.logoutError', req) 
        });
    }
});

// Vérification du statut d'authentification
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: t('errors.userNotFound', req)
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                whatsappNumber: user.whatsappNumber,
                settings: user.settings,
                onboardingCompleted: user.onboardingCompleted,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        LogService.error('Erreur lors de la vérification du statut:', {
            userId: req.user?.id,
            error: error.message
        });
        
        res.status(500).json({
            success: false,
            error: t('errors.internalServerError', req)
        });
    }
});

module.exports = router;