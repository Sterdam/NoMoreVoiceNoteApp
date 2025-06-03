const LogService = require('../services/LogService');

// On peut désactiver le CSRF via variable d'environnement
const isDevelopment = process.env.NODE_ENV === 'development';
const csrfEnabled = process.env.ENABLE_CSRF === 'true' && !isDevelopment;

// Middleware factice pour le développement
const noopMiddleware = (req, res, next) => next();

// Génération de token factice en développement
const devGetCSRFToken = (req, res) => {
    res.json({ csrfToken: 'dev-csrf-token' });
};

// Chargement conditionnel du module CSRF
let csrfModule = null;
if (csrfEnabled) {
    try {
        const { doubleCsrf } = require('csrf-csrf');
        csrfModule = doubleCsrf({
            getSecret: () => process.env.CSRF_SECRET || process.env.COOKIE_SECRET || 'csrf-secret-key',
            cookieName: 'csrf-token',
            cookieOptions: {
                httpOnly: true,
                sameSite: 'strict',
                secure: true,
                maxAge: 12 * 60 * 60 * 1000
            },
            getTokenFromRequest: (req) => {
                return req.headers['x-csrf-token'] || req.body._csrf;
            }
        });
    } catch (error) {
        LogService.error('Failed to load CSRF module:', error);
    }
}

// Export des fonctions selon l'environnement
module.exports = {
    doubleCsrfProtection: !csrfEnabled ? noopMiddleware : (csrfModule?.doubleCsrfProtection || noopMiddleware),
    generateCSRFToken: !csrfEnabled ? noopMiddleware : (csrfModule?.generateToken ? (req, res, next) => {
        try {
            const token = csrfModule.generateToken(req, res);
            res.locals.csrfToken = token;
            next();
        } catch (error) {
            LogService.error('Error generating CSRF token:', error);
            next();
        }
    } : noopMiddleware),
    validateCSRF: !csrfEnabled ? noopMiddleware : (csrfModule?.validateRequest ? (req, res, next) => {
        // Ignorer certaines routes
        const ignorePaths = ['/api/payment/webhook', '/health', '/api/csrf-token', '/api/legal'];
        if (ignorePaths.some(path => req.path.startsWith(path))) {
            return next();
        }
        
        // Ignorer GET, HEAD, OPTIONS
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            return next();
        }
        
        try {
            const valid = csrfModule.validateRequest(req);
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
    } : noopMiddleware),
    getCSRFToken: !csrfEnabled ? devGetCSRFToken : (csrfModule ? (req, res) => {
        try {
            const token = csrfModule.generateToken(req, res);
            res.json({ csrfToken: token });
        } catch (error) {
            LogService.error('Error in CSRF token endpoint:', error);
            res.json({ csrfToken: 'error-fallback-token' });
        }
    } : devGetCSRFToken)
};