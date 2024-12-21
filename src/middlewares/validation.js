// src/middlewares/validation.js
const { validationResult, body } = require('express-validator');
const LogService = require('../services/LogService');

const validate = (validations) => {
    return async (req, res, next) => {
        for (let validation of validations) {
            const result = await validation.run(req);
            if (!result.isEmpty()) break;
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            LogService.warn('Validation failed:', { 
                path: req.path, 
                errors: errors.array() 
            });
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    };
};

// Validations communes
const registrationValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email invalide'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Le mot de passe doit contenir au moins 8 caractères')
        .matches(/\d/)
        .withMessage('Le mot de passe doit contenir au moins un chiffre')
        .matches(/[A-Z]/)
        .withMessage('Le mot de passe doit contenir au moins une majuscule'),
    body('whatsappNumber')
        .matches(/^\+[1-9]\d{1,14}$/)
        .withMessage('Numéro WhatsApp invalide (format: +XXXXXXXXXX)')
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email invalide'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Mot de passe invalide')
];

const transcriptionValidation = [
    body('messageId')
        .notEmpty()
        .withMessage('ID du message requis'),
    body('language')
        .optional()
        .isIn(['fr', 'en', 'es', 'auto'])
        .withMessage('Langue non supportée')
];

module.exports = {
    validate,
    registrationValidation,
    loginValidation,
    transcriptionValidation
};