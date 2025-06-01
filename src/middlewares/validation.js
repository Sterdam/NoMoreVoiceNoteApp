// src/middlewares/validation.js
const { validationResult, body, param, query } = require('express-validator');
const LogService = require('../services/LogService');
const validator = require('validator');

const validate = (validations) => {
    return async (req, res, next) => {
        // Exécuter toutes les validations
        for (let validation of validations) {
            const result = await validation.run(req);
            if (!result.isEmpty()) break;
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Créer un log détaillé des erreurs
            const errorDetails = errors.array().map(err => ({
                field: err.path || err.param,
                value: err.value,
                message: err.msg,
                location: err.location
            }));
            
            LogService.warn('Validation failed:', { 
                path: req.path,
                method: req.method,
                errors: errorDetails,
                body: {
                    ...req.body,
                    password: req.body.password ? '[REDACTED]' : undefined
                }
            });
            
            // Retourner les erreurs de manière claire
            return res.status(400).json({ 
                error: 'Erreur de validation',
                errors: errors.array().map(err => ({
                    field: err.path || err.param,
                    message: err.msg
                }))
            });
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
    // Vérifier que le numéro n'est pas vide
    if (!number) return false;
    
    // Retirer tous les espaces et tirets
    const cleanNumber = number.replace(/[\s-]/g, '');
    
    // Format E.164: +[code pays][numéro]
    if (!cleanNumber.startsWith('+')) return false;
    
    // Enlever le + et vérifier que ce sont uniquement des chiffres
    const digits = cleanNumber.substring(1);
    if (!/^\d+$/.test(digits)) return false;
    
    // Vérifier la longueur (min 7, max 15 chiffres sans le +)
    if (digits.length < 7 || digits.length > 15) return false;
    
    // Vérifier les codes pays valides (liste étendue)
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
        '689',  // French Polynesia
        '7',    // Russia
        '20',   // Egypt
        '27',   // South Africa
        '30',   // Greece
        '351',  // Portugal
        '353',  // Ireland
        '354',  // Iceland
        '356',  // Malta
        '357',  // Cyprus
        '358',  // Finland
        '359',  // Bulgaria
        '370',  // Lithuania
        '371',  // Latvia
        '372',  // Estonia
        '373',  // Moldova
        '374',  // Armenia
        '375',  // Belarus
        '376',  // Andorra
        '377',  // Monaco
        '378',  // San Marino
        '380',  // Ukraine
        '381',  // Serbia
        '382',  // Montenegro
        '383',  // Kosovo
        '385',  // Croatia
        '386',  // Slovenia
        '387',  // Bosnia
        '389',  // Macedonia
        '420',  // Czech Republic
        '421',  // Slovakia
        '423',  // Liechtenstein
        '43',   // Austria
        '45',   // Denmark
        '46',   // Sweden
        '47',   // Norway
        '48',   // Poland
        '60',   // Malaysia
        '61',   // Australia
        '62',   // Indonesia
        '63',   // Philippines
        '64',   // New Zealand
        '65',   // Singapore
        '66',   // Thailand
        '84',   // Vietnam
        '90',   // Turkey
        '92',   // Pakistan
        '93',   // Afghanistan
        '94',   // Sri Lanka
        '95',   // Myanmar
        '98',   // Iran
        '880',  // Bangladesh
        '886',  // Taiwan
        '960',  // Maldives
        '961',  // Lebanon
        '962',  // Jordan
        '963',  // Syria
        '964',  // Iraq
        '965',  // Kuwait
        '966',  // Saudi Arabia
        '967',  // Yemen
        '968',  // Oman
        '971',  // UAE
        '972',  // Israel
        '973',  // Bahrain
        '974',  // Qatar
        '975',  // Bhutan
        '976',  // Mongolia
        '977'   // Nepal
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
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                throw new Error('Cet email est déjà utilisé');
            }
            return true;
        }),
    body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
        .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&)')
        .custom((password) => {
            // Vérifier qu'il n'y a pas d'espaces
            if (password.includes(' ')) {
                throw new Error('Le mot de passe ne doit pas contenir d\'espaces');
            }
            return true;
        }),
    body('whatsappNumber')
        .trim()
        .custom(isValidWhatsAppNumber)
        .withMessage('Numéro WhatsApp invalide. Format attendu: +[code pays][numéro] (ex: +33612345678)')
        .bail()
        .custom(async (number) => {
            // Nettoyer le numéro avant de vérifier l'unicité
            const cleanNumber = number.replace(/[\s-]/g, '');
            
            // Vérifier l'unicité du numéro
            const User = require('../models/User');
            const existingUser = await User.findOne({ whatsappNumber: cleanNumber });
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
        .optional()
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
        .withMessage('Email invalide ou non autorisé')
        .bail()
        .custom(async (email, { req }) => {
            // Vérifier l'unicité seulement si l'email change
            const User = require('../models/User');
            const existingUser = await User.findOne({ 
                email: email.toLowerCase(),
                _id: { $ne: req.user._id }
            });
            if (existingUser) {
                throw new Error('Cet email est déjà utilisé');
            }
            return true;
        }),
    body('whatsappNumber')
        .optional()
        .trim()
        .custom(isValidWhatsAppNumber)
        .withMessage('Numéro WhatsApp invalide')
        .bail()
        .custom(async (number, { req }) => {
            const cleanNumber = number.replace(/[\s-]/g, '');
            const User = require('../models/User');
            const existingUser = await User.findOne({ 
                whatsappNumber: cleanNumber,
                _id: { $ne: req.user._id }
            });
            if (existingUser) {
                throw new Error('Ce numéro WhatsApp est déjà utilisé');
            }
            return true;
        }),
    body('password')
        .optional()
        .isLength({ min: 8, max: 128 })
        .withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
        .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial')
        .custom((password) => {
            if (password.includes(' ')) {
                throw new Error('Le mot de passe ne doit pas contenir d\'espaces');
            }
            return true;
        })
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