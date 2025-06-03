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
        // Routes à ignorer complètement
        const ignorePaths = [
            '/api/payment/webhook',      // Webhook Stripe
            '/api/health',              // Health checks
            '/api/csrf-token',          // Endpoint pour obtenir le token
            '/api/legal',               // Routes légales
            '/api/transcripts/whatsapp-qr',     // QR code WhatsApp
            '/api/transcripts/whatsapp-status', // Status WhatsApp
            '/api/users/whatsapp-status'        // Status WhatsApp (autre endpoint)
        ];
        
        // Vérifier si le path doit être ignoré
        if (ignorePaths.some(path => req.path.startsWith(path))) {
            LogService.debug(`CSRF validation skipped for path: ${req.path}`);
            return next();
        }
        
        // Ignorer les méthodes sûres (GET, HEAD, OPTIONS)
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            LogService.debug(`CSRF validation skipped for method: ${req.method} ${req.path}`);
            return next();
        }
        
        // Log pour debug
        LogService.debug(`CSRF validation checking for: ${req.method} ${req.path}`, {
            hasToken: !!req.headers['x-csrf-token'],
            headers: Object.keys(req.headers)
        });
        
        try {
            const valid = csrfModule.validateRequest(req);
            if (!valid) {
                LogService.warn('CSRF token validation failed:', {
                    path: req.path,
                    method: req.method,
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                });
                return res.status(403).json({ 
                    error: 'Invalid CSRF token',
                    message: 'Security validation failed. Please refresh the page and try again.'
                });
            }
            next();
        } catch (error) {
            LogService.error('CSRF validation error:', {
                error: error.message,
                path: req.path,
                method: req.method
            });
            res.status(403).json({ 
                error: 'CSRF validation failed',
                message: 'Security check failed. Please try again.'
            });
        }
    } : noopMiddleware),
    
    getCSRFToken: !csrfEnabled ? devGetCSRFToken : (csrfModule ? (req, res) => {
        try {
            const token = csrfModule.generateToken(req, res);
            LogService.debug('CSRF token generated', { 
                tokenLength: token?.length,
                path: req.path 
            });
            res.json({ csrfToken: token });
        } catch (error) {
            LogService.error('Error in CSRF token endpoint:', error);
            res.json({ csrfToken: 'error-fallback-token' });
        }
    } : devGetCSRFToken),
    
    // Fonction utilitaire pour obtenir le token dans les vues
    getTokenForView: !csrfEnabled ? () => 'dev-csrf-token' : (req) => {
        if (!csrfModule) return 'no-csrf-module';
        try {
            return csrfModule.generateToken(req);
        } catch (error) {
            LogService.error('Error generating CSRF token for view:', error);
            return 'error-token';
        }
    },
    
    // Middleware pour injecter le token CSRF dans les réponses
    injectCSRFToken: !csrfEnabled ? noopMiddleware : (req, res, next) => {
        if (csrfModule) {
            try {
                const token = csrfModule.generateToken(req, res);
                // Ajouter le token dans les headers de réponse pour les requêtes AJAX
                res.setHeader('X-CSRF-Token', token);
                // Aussi disponible dans res.locals pour les templates
                res.locals.csrfToken = token;
            } catch (error) {
                LogService.error('Error injecting CSRF token:', error);
            }
        }
        next();
    }
};