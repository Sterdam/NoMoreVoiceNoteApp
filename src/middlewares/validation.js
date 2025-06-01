// src/middlewares/validation.js
const { validationResult, body, param, query } = require('express-validator');
const LogService = require('../services/LogService');

const validate = (validations) => {
    return async (req, res, next) => {
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
            const User = require('../models/User');
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                throw new Error('Cet email est déjà utilisé');
            }
            return true;
        }),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('whatsappNumber')
        .trim()
        .notEmpty()
        .withMessage('Numéro WhatsApp requis')
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Numéro WhatsApp invalide (ex: +33612345678)')
        .custom(async (number) => {
            const User = require('../models/User');
            const existingUser = await User.findOne({ whatsappNumber: number });
            if (existingUser) {
                throw new Error('Ce numéro WhatsApp est déjà utilisé');
            }
            return true;
        }),
    body('terms')
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