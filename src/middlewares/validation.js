// src/middlewares/validation.js
const { validationResult, body, param, query } = require('express-validator');
const LogService = require('../services/LogService');
const validator = require('validator');

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

// Fonction de validation personnalisée pour les emails
const isValidEmail = (email) => {
    // Vérifier la longueur et les caractères de base
    if (!email || email.length > 254) return false;
    
    // Vérifier le format avec validator
    if (!validator.isEmail(email, {
        allow_display_name: false,
        require_display_name: false,
        allow_utf8_local_part: false,
        require_tld: true,
        allow_ip_domain: false,
        domain_specific_validation: true
    })) return false;
    
    // Vérifier les domaines jetables courants
    const disposableDomains = ['tempmail.com', 'throwaway.email', 'guerrillamail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) return false;
    
    return true;
};

// Fonction de validation personnalisée pour WhatsApp
const isValidWhatsAppNumber = (number) => {
    // Format E.164: +[code pays][numéro]
    if (!number || !number.startsWith('+')) return false;
    
    // Enlever le + et vérifier que ce sont uniquement des chiffres
    const digits = number.substring(1);
    if (!/^\d+$/.test(digits)) return false;
    
    // Vérifier la longueur (min 7, max 15 chiffres)
    if (digits.length < 7 || digits.length > 15) return false;
    
    // Vérifier les codes pays valides (exemples)
    const validCountryCodes = [
        '1',    // USA/Canada
        '33',   // France
        '44',   // UK
        '49',   // Germany
        '34',   // Spain
        '39',   // Italy
        '41',   // Switzerland
        '32',   // Belgium
        '31',   // Netherlands
        '352',  // Luxembourg
        '212',  // Morocco
        '213',  // Algeria
        '216',  // Tunisia
        '237',  // Cameroon
        '221',  // Senegal
        '225',  // Ivory Coast
        '242',  // Congo
        '243',  // DRC
        '91',   // India
        '86',   // China
        '81',   // Japan
        '82',   // South Korea
        '55',   // Brazil
        '52',   // Mexico
        '54',   // Argentina
        '57',   // Colombia
        '51',   // Peru
        '56',   // Chile
        '507',  // Panama
        '509',  // Haiti
        '596',  // Martinique
        '590',  // Guadeloupe
        '594',  // French Guiana
        '262',  // Réunion
        '269',  // Mayotte
        '687',  // New Caledonia
        '689'   // French Polynesia
    ];
    
    // Vérifier si le numéro commence par un code pays valide
    const hasValidCountryCode = validCountryCodes.some(code => digits.startsWith(code));
    if (!hasValidCountryCode) return false;
    
    return true;
};

// Validations communes
const registrationValidation = [
    body('email')
        .trim()
        .normalizeEmail()
        .custom(isValidEmail)
        .withMessage('Email invalide ou non autorisé')
        .bail()
        .custom(async (email) => {
            // Vérifier l'unicité de l'email
            const User = require('../models/User');
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw new Error('Cet email est déjà utilisé');
            }
            return true;
        }),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial')
        .not().contains(' ')
        .withMessage('Le mot de passe ne doit pas contenir d\'espaces'),
    body('whatsappNumber')
        .trim()
        .custom(isValidWhatsAppNumber)
        .withMessage('Numéro WhatsApp invalide. Format attendu: +[code pays][numéro] (ex: +33612345678)')
        .bail()
        .custom(async (number) => {
            // Vérifier l'unicité du numéro
            const User = require('../models/User');
            const existingUser = await User.findOne({ whatsappNumber: number });
            if (existingUser) {
                throw new Error('Ce numéro WhatsApp est déjà utilisé');
            }
            return true;
        })
];

const loginValidation = [
    body('email')
        .trim()
        .normalizeEmail()
        .custom(isValidEmail)
        .withMessage('Email invalide'),
    body('password')
        .notEmpty()
        .withMessage('Mot de passe requis')
        .isLength({ min: 1 })
        .withMessage('Mot de passe invalide')
];

const transcriptionValidation = [
    body('messageId')
        .notEmpty()
        .withMessage('ID du message requis')
        .isString()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('ID du message invalide'),
    body('language')
        .optional()
        .isIn(['fr', 'en', 'es', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'auto'])
        .withMessage('Langue non supportée')
];

// Validation pour la mise à jour du profil
const profileUpdateValidation = [
    body('email')
        .optional()
        .trim()
        .normalizeEmail()
        .custom(isValidEmail)
        .withMessage('Email invalide ou non autorisé'),
    body('whatsappNumber')
        .optional()
        .trim()
        .custom(isValidWhatsAppNumber)
        .withMessage('Numéro WhatsApp invalide'),
    body('password')
        .optional()
        .isLength({ min: 8, max: 128 })
        .withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial')
];

// Validation pour les paramètres de requête
const paginationValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page invalide'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limite invalide (1-100)')
];

// Validation pour les IDs MongoDB
const mongoIdValidation = (paramName = 'id') => [
    param(paramName)
        .isMongoId()
        .withMessage('ID invalide')
];

module.exports = {
    validate,
    registrationValidation,
    loginValidation,
    transcriptionValidation,
    profileUpdateValidation,
    paginationValidation,
    mongoIdValidation,
    isValidEmail,
    isValidWhatsAppNumber
};