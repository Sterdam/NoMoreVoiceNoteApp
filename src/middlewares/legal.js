// Legal compliance middleware
const LogService = require('../services/LogService');

/**
 * Legal disclaimers and compliance middleware
 * Adds legal protection headers and handles compliance requirements
 */

// Legal disclaimers for API responses
const LEGAL_DISCLAIMERS = {
    transcription: {
        accuracy: "Transcription accuracy is not guaranteed. Results may vary based on audio quality, language, accent, and other factors beyond our control.",
        aiLimitations: "This transcription was generated using artificial intelligence. AI-generated content may contain errors or inaccuracies.",
        thirdPartyServices: "This service uses third-party AI APIs. Your data may be processed by external services according to their privacy policies.",
        noLiability: "VoxKill disclaims all liability for transcription errors, omissions, or inaccuracies.",
        userResponsibility: "Users are solely responsible for verifying transcription accuracy and compliance with applicable laws."
    },
    general: {
        serviceAvailability: "Service availability is not guaranteed. Downtime may occur without notice.",
        dataProcessing: "By using this API, you consent to data processing as described in our Privacy Policy.",
        termsAcceptance: "Use of this API constitutes acceptance of our Terms of Service.",
        jurisdiction: "This service is governed by applicable laws. Users must comply with all relevant regulations.",
        intellectualProperty: "Respect intellectual property rights. Do not transcribe copyrighted content without permission."
    },
    privacy: {
        dataCollection: "This service collects and processes personal data as described in our Privacy Policy.",
        thirdPartySharing: "Data may be shared with third-party service providers for transcription processing.",
        retention: "Data retention periods are specified in our Privacy Policy.",
        userRights: "You have rights regarding your personal data as described in our Privacy Policy.",
        consent: "Continued use implies consent to data processing practices."
    }
};

/**
 * Add legal compliance headers to all API responses
 */
const addLegalHeaders = (req, res, next) => {
    // Legal compliance headers
    res.setHeader('X-Legal-Terms', 'https://voxkill.com/terms');
    res.setHeader('X-Privacy-Policy', 'https://voxkill.com/privacy');
    res.setHeader('X-Service-Disclaimer', 'Service provided AS-IS without warranties');
    res.setHeader('X-Data-Processing-Notice', 'Data processed according to Privacy Policy');
    res.setHeader('X-Third-Party-Services', 'Uses external AI APIs for processing');
    res.setHeader('X-Liability-Limitation', 'Liability limited as per Terms of Service');
    res.setHeader('X-GDPR-Compliance', 'GDPR compliant data processing');
    res.setHeader('X-CCPA-Compliance', 'CCPA compliant data handling');
    
    // Content Security and Legal
    res.setHeader('X-Content-Accuracy-Disclaimer', 'AI-generated content accuracy not guaranteed');
    res.setHeader('X-User-Responsibility', 'Users responsible for content compliance');
    res.setHeader('X-IP-Rights-Notice', 'Respect intellectual property rights');
    
    next();
};

/**
 * Add legal disclaimers to API responses
 */
const addLegalDisclaimers = (type = 'general') => {
    return (req, res, next) => {
        const originalJson = res.json;
        
        res.json = function(data) {
            // Add legal disclaimers to response
            const responseWithDisclaimers = {
                ...data,
                legal: {
                    disclaimers: LEGAL_DISCLAIMERS[type] || LEGAL_DISCLAIMERS.general,
                    terms: "https://voxkill.com/terms",
                    privacy: "https://voxkill.com/privacy",
                    lastUpdated: "2025-01-06",
                    jurisdiction: "Service governed by applicable laws",
                    notice: "Use of this service constitutes acceptance of our Terms of Service and Privacy Policy"
                }
            };
            
            originalJson.call(this, responseWithDisclaimers);
        };
        
        next();
    };
};

/**
 * Validate user consent and legal compliance
 */
const validateLegalConsent = async (req, res, next) => {
    try {
        // Check if user has accepted terms and privacy policy
        if (req.user) {
            const user = req.user;
            
            // Check if user has accepted current terms version
            const currentTermsVersion = "2025-01-06";
            const currentPrivacyVersion = "2025-01-06";
            
            if (!user.termsAcceptedVersion || user.termsAcceptedVersion !== currentTermsVersion) {
                return res.status(451).json({
                    error: "Terms of Service acceptance required",
                    message: "You must accept the current Terms of Service to use this service",
                    termsUrl: "https://voxkill.com/terms",
                    currentVersion: currentTermsVersion,
                    action: "Please review and accept the updated Terms of Service"
                });
            }
            
            if (!user.privacyAcceptedVersion || user.privacyAcceptedVersion !== currentPrivacyVersion) {
                return res.status(451).json({
                    error: "Privacy Policy acceptance required", 
                    message: "You must accept the current Privacy Policy to use this service",
                    privacyUrl: "https://voxkill.com/privacy",
                    currentVersion: currentPrivacyVersion,
                    action: "Please review and accept the updated Privacy Policy"
                });
            }
        }
        
        next();
    } catch (error) {
        LogService.error('Legal consent validation error:', error);
        res.status(500).json({
            error: "Legal compliance check failed",
            message: "Unable to verify legal consent. Please try again.",
            legal: LEGAL_DISCLAIMERS.general
        });
    }
};

/**
 * Content compliance validation for transcription requests
 */
const validateContentCompliance = (req, res, next) => {
    // Add content type validation
    const contentType = req.headers['content-type'] || '';
    const userAgent = req.headers['user-agent'] || '';
    
    // Log for compliance monitoring
    LogService.info('Content compliance check:', {
        userId: req.user?.id,
        contentType,
        userAgent,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });
    
    // Add compliance warning to request
    req.complianceWarning = {
        message: "User is responsible for ensuring uploaded content complies with applicable laws",
        restrictions: [
            "No copyrighted content without permission",
            "No illegal content",
            "No content violating third-party rights",
            "No sensitive personal information of others without consent"
        ]
    };
    
    next();
};

/**
 * Age verification middleware
 */
const verifyAge = (req, res, next) => {
    // Add age verification header
    res.setHeader('X-Age-Requirement', 'Service requires users to be 16 years or older');
    
    // This should be implemented with proper age verification
    // For now, we just add the legal notice
    if (req.user && req.user.dateOfBirth) {
        const age = Math.floor((Date.now() - new Date(req.user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 16) {
            return res.status(403).json({
                error: "Age requirement not met",
                message: "Users must be 16 years or older to use this service",
                legal: {
                    requirement: "Minimum age 16 years",
                    parentalConsent: "Parental consent required for users under 16",
                    dataProtection: "Enhanced privacy protections for minors"
                }
            });
        }
    }
    
    next();
};

/**
 * Audit logging for legal compliance
 */
const auditLog = (action) => {
    return (req, res, next) => {
        const auditData = {
            userId: req.user?.id || 'anonymous',
            action,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString(),
            endpoint: req.path,
            method: req.method
        };
        
        LogService.info('Legal audit log:', auditData);
        
        // Store in audit log (implement proper audit storage)
        req.auditLog = auditData;
        
        next();
    };
};

/**
 * GDPR compliance checker
 */
const checkGDPRCompliance = (req, res, next) => {
    const isEUUser = req.headers['cf-ipcountry'] && 
                     ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'].includes(req.headers['cf-ipcountry']);
    
    if (isEUUser) {
        res.setHeader('X-GDPR-Subject', 'true');
        res.setHeader('X-Data-Controller', 'VoxKill');
        res.setHeader('X-DPO-Contact', 'dpo@voxkill.com');
        res.setHeader('X-Legal-Basis', 'Contract performance and legitimate interests');
    }
    
    req.isGDPRSubject = isEUUser;
    next();
};

/**
 * Export control compliance
 */
const checkExportCompliance = (req, res, next) => {
    // Add export control notices
    res.setHeader('X-Export-Control', 'Service subject to export control laws');
    res.setHeader('X-Restricted-Countries', 'Service not available in certain jurisdictions');
    
    // Check for restricted countries (implement your restrictions)
    const restrictedCountries = ['IR', 'KP', 'SY', 'CU']; // Example restricted countries
    const userCountry = req.headers['cf-ipcountry'];
    
    if (restrictedCountries.includes(userCountry)) {
        return res.status(451).json({
            error: "Service not available",
            message: "This service is not available in your jurisdiction due to legal restrictions",
            legal: {
                reason: "Export control and sanctions compliance",
                contact: "legal@voxkill.com for inquiries"
            }
        });
    }
    
    next();
};

module.exports = {
    addLegalHeaders,
    addLegalDisclaimers,
    validateLegalConsent,
    validateContentCompliance,
    verifyAge,
    auditLog,
    checkGDPRCompliance,
    checkExportCompliance,
    LEGAL_DISCLAIMERS
};