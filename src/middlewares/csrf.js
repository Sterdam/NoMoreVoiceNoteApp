const { doubleCsrf } = require('csrf-csrf');
const LogService = require('../services/LogService');

// Configuration CSRF avec double submit pattern
const { generateToken, validateRequest, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || process.env.COOKIE_SECRET || 'csrf-secret-key',
    cookieName: 'csrf-token',
    cookieOptions: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 12 * 60 * 60 * 1000 // 12 heures
    },
    getTokenFromRequest: (req) => {
        // Token peut être dans l'en-tête ou le body
        return req.headers['x-csrf-token'] || req.body._csrf;
    }
});

// Middleware pour générer le token CSRF
const generateCSRFToken = (req, res, next) => {
    try {
        const token = generateToken(req, res);
        res.locals.csrfToken = token;
        next();
    } catch (error) {
        LogService.error('Error generating CSRF token:', error);
        next();
    }
};

// Middleware pour valider le token CSRF
const validateCSRF = (req, res, next) => {
    // En mode développement, être plus permissif
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    // Ignorer la validation pour certaines routes
    const ignorePaths = [
        '/api/payment/webhook', // Webhook Stripe
        '/health',
        '/api/csrf-token',
        '/api/legal'
    ];

    if (ignorePaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    // Ignorer pour les méthodes GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    try {
        const valid = validateRequest(req);
        if (!valid) {
            LogService.warn('CSRF token validation failed:', {
                path: req.path,
                method: req.method,
                ip: req.ip
            });
            return res.status(403).json({ error: 'Invalid CSRF token' });
        }
        next();
    } catch (error) {
        LogService.error('CSRF validation error:', error);
        res.status(403).json({ error: 'CSRF validation failed' });
    }
};

// Route pour obtenir un nouveau token CSRF
const getCSRFToken = (req, res) => {
    try {
        // En développement, retourner un token factice
        if (process.env.NODE_ENV === 'development') {
            return res.json({ csrfToken: 'dev-csrf-token' });
        }
        
        const token = generateToken(req, res);
        res.json({ csrfToken: token });
    } catch (error) {
        LogService.error('Error generating CSRF token:', error);
        // Fallback en cas d'erreur
        res.json({ csrfToken: 'fallback-token' });
    }
};

module.exports = {
    doubleCsrfProtection,
    generateCSRFToken,
    validateCSRF,
    getCSRFToken
};