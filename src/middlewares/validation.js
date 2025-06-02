// src/middlewares/validation.js
const { validationResult, body, param, query } = require('express-validator');
const LogService = require('../services/LogService');
const User = require('../models/User'); // Import au début pour éviter les problèmes

const validate = (validations) => {
    return async (req, res, next) => {
        try {
            // Exécuter toutes les validations
            for (let validation of validations) {
                const result = await validation.run(req);
                if (!result.isEmpty()) break;
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                LogService.warn('Validation failed:', { 
                    path: req.path,
                    method: req.method,
                    errors: errors.array(),
                    body: {
                        ...req.body,
                        password: req.body.password ? '[REDACTED]' : undefined
                    }
                });
                
                // Retourner la première erreur de manière claire
                const firstError = errors.array()[0];
                return res.status(400).json({ 
                    error: firstError.msg
                });
            }
            next();
        } catch (error) {
            LogService.error('Erreur dans la validation:', {
                error: error.message,
                stack: error.stack,
                path: req.path
            });
            return res.status(500).json({
                error: 'Erreur lors de la validation'
            });
        }
    };
};

// Validation simplifiée pour l'inscription
const registrationValidation = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email invalide')
        .normalizeEmail()
        .custom(async (email) => {
            try {
                const existingUser = await User.findOne({ email: email.toLowerCase() });
                if (existingUser) {
                    throw new Error('Cet email est déjà utilisé');
                }
                return true;
            } catch (error) {
                if (error.message === 'Cet email est déjà utilisé') {
                    throw error;
                }
                LogService.error('Erreur lors de la vérification email:', {
                    error: error.message,
                    email
                });
                throw new Error('Erreur lors de la vérification de l\'email');
            }
        }),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Le mot de passe doit contenir au moins 8 caractères'),
    body('whatsappNumber')
        .trim()
        .notEmpty()
        .withMessage('Numéro WhatsApp requis')
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Numéro WhatsApp invalide (ex: +33612345678)')
        .custom(async (number) => {
            try {
                const existingUser = await User.findOne({ whatsappNumber: number });
                if (existingUser) {
                    throw new Error('Ce numéro WhatsApp est déjà utilisé');
                }
                return true;
            } catch (error) {
                if (error.message === 'Ce numéro WhatsApp est déjà utilisé') {
                    throw error;
                }
                LogService.error('Erreur lors de la vérification WhatsApp:', {
                    error: error.message,
                    number
                });
                throw new Error('Erreur lors de la vérification du numéro WhatsApp');
            }
        }),
    body('terms')
        .optional()
        .isBoolean()
        .withMessage('Vous devez accepter les conditions')
        .equals('true')
        .withMessage('Vous devez accepter les conditions d\'utilisation')
];

const loginValidation = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email invalide')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Mot de passe requis')
];

module.exports = {
    validate,
    registrationValidation,
    loginValidation
};