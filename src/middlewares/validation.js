// src/middlewares/validation.js
const { validationResult, body, param, query } = require('express-validator');
const LogService = require('../services/LogService');
const User = require('../models/User'); // Import au début pour éviter les problèmes
const { t } = require('../utils/translate');

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
                error: t('errors.validationError', req)
            });
        }
    };
};

// Validation simplifiée pour l'inscription
const registrationValidation = [
    body('email')
        .trim()
        .isEmail()
        .withMessage((value, { req }) => t('errors.invalidEmail', req))
        .normalizeEmail()
        .custom(async (email) => {
            try {
                const existingUser = await User.findOne({ email: email.toLowerCase() });
                if (existingUser) {
                    throw new Error(t('errors.emailAlreadyUsed', req));
                }
                return true;
            } catch (error) {
                if (error.message === t('errors.emailAlreadyUsed', req)) {
                    throw error;
                }
                LogService.error('Erreur lors de la vérification email:', {
                    error: error.message,
                    email
                });
                throw new Error(t('errors.emailVerificationError', req));
            }
        }),
    body('password')
        .isLength({ min: 8 })
        .withMessage((value, { req }) => t('errors.passwordMinLength', req)),
    body('whatsappNumber')
        .trim()
        .notEmpty()
        .withMessage((value, { req }) => t('errors.whatsappRequired', req))
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage((value, { req }) => t('errors.invalidWhatsappNumber', req))
        .custom(async (number) => {
            try {
                const existingUser = await User.findOne({ whatsappNumber: number });
                if (existingUser) {
                    throw new Error(t('errors.whatsappAlreadyUsed', req));
                }
                return true;
            } catch (error) {
                if (error.message === t('errors.whatsappAlreadyUsed', req)) {
                    throw error;
                }
                LogService.error('Erreur lors de la vérification WhatsApp:', {
                    error: error.message,
                    number
                });
                throw new Error(t('errors.whatsappVerificationError', req));
            }
        }),
    body('terms')
        .optional()
        .isBoolean()
        .withMessage((value, { req }) => t('errors.termsAcceptanceRequired', req))
        .equals('true')
        .withMessage((value, { req }) => t('errors.termsAcceptanceRequired', req))
];

const loginValidation = [
    body('email')
        .trim()
        .isEmail()
        .withMessage((value, { req }) => t('errors.invalidEmail', req))
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage((value, { req }) => t('errors.passwordRequired', req))
];

module.exports = {
    validate,
    registrationValidation,
    loginValidation
};