const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { auditLog, addLegalDisclaimers } = require('../middlewares/legal');
const User = require('../models/User');
const LogService = require('../services/LogService');

// Terms of Service endpoint
router.get('/terms', addLegalDisclaimers('general'), (req, res) => {
    res.json({
        title: "Terms of Service",
        version: "2025-01-06",
        effectiveDate: "2025-01-06",
        lastUpdated: "2025-01-06",
        url: "https://voxkill.com/terms",
        summary: "Complete terms governing the use of VoxKill services",
        keyPoints: [
            "Service provided AS-IS without warranties",
            "User responsible for content compliance",
            "Limited liability for transcription accuracy",
            "AI-generated content may contain errors",
            "Third-party services used for processing"
        ],
        acceptance: {
            required: true,
            method: "Click-through acceptance",
            evidence: "Digital acceptance logged with timestamp and IP"
        },
        governing_law: "Applicable jurisdiction laws",
        dispute_resolution: "Binding arbitration clause included"
    });
});

// Privacy Policy endpoint
router.get('/privacy', addLegalDisclaimers('privacy'), (req, res) => {
    res.json({
        title: "Privacy Policy",
        version: "2025-01-06",
        effectiveDate: "2025-01-06",
        lastUpdated: "2025-01-06",
        url: "https://voxkill.com/privacy",
        summary: "Complete privacy practices and data protection information",
        dataProcessing: {
            personalData: ["Email", "Name", "Phone number", "Payment info"],
            audioData: ["Voice recordings", "Transcribed text", "Metadata"],
            usageData: ["Service analytics", "Error logs", "Performance data"],
            retention: "Specified in full policy document"
        },
        thirdPartyServices: [
            {
                name: "OpenAI Whisper",
                purpose: "Audio transcription",
                dataShared: "Audio files for processing",
                privacy: "https://openai.com/privacy"
            },
            {
                name: "Stripe",
                purpose: "Payment processing",
                dataShared: "Payment information",
                privacy: "https://stripe.com/privacy"
            }
        ],
        userRights: {
            access: "Right to access personal data",
            correction: "Right to correct inaccurate data",
            deletion: "Right to delete personal data",
            portability: "Right to data portability",
            restriction: "Right to restrict processing"
        },
        compliance: ["GDPR", "CCPA", "SOC 2", "ISO 27001"]
    });
});

// Accept Terms of Service
router.post('/accept-terms', auth, auditLog('terms_acceptance'), async (req, res) => {
    try {
        const { version } = req.body;
        const currentVersion = "2025-01-06";
        
        if (version !== currentVersion) {
            return res.status(400).json({
                error: "Invalid terms version",
                message: "You must accept the current terms version",
                currentVersion,
                provided: version
            });
        }
        
        // Update user's terms acceptance
        await User.findByIdAndUpdate(req.user._id, {
            termsAcceptedVersion: currentVersion,
            termsAcceptedDate: new Date(),
            termsAcceptedIP: req.ip,
            termsAcceptedUserAgent: req.headers['user-agent']
        });
        
        LogService.info('Terms acceptance:', {
            userId: req.user._id,
            version: currentVersion,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });
        
        res.json({
            message: "Terms of Service accepted successfully",
            version: currentVersion,
            acceptedDate: new Date().toISOString(),
            legal: {
                binding: true,
                evidence: "Digital acceptance recorded",
                compliance: "Legally binding agreement established"
            }
        });
        
    } catch (error) {
        LogService.error('Terms acceptance error:', error);
        res.status(500).json({
            error: "Failed to record terms acceptance",
            message: "Please try again or contact support"
        });
    }
});

// Accept Privacy Policy
router.post('/accept-privacy', auth, auditLog('privacy_acceptance'), async (req, res) => {
    try {
        const { version } = req.body;
        const currentVersion = "2025-01-06";
        
        if (version !== currentVersion) {
            return res.status(400).json({
                error: "Invalid privacy policy version",
                message: "You must accept the current privacy policy version",
                currentVersion,
                provided: version
            });
        }
        
        // Update user's privacy policy acceptance
        await User.findByIdAndUpdate(req.user._id, {
            privacyAcceptedVersion: currentVersion,
            privacyAcceptedDate: new Date(),
            privacyAcceptedIP: req.ip,
            privacyAcceptedUserAgent: req.headers['user-agent']
        });
        
        LogService.info('Privacy policy acceptance:', {
            userId: req.user._id,
            version: currentVersion,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });
        
        res.json({
            message: "Privacy Policy accepted successfully",
            version: currentVersion,
            acceptedDate: new Date().toISOString(),
            legal: {
                binding: true,
                evidence: "Digital consent recorded",
                compliance: "Data processing consent established"
            }
        });
        
    } catch (error) {
        LogService.error('Privacy acceptance error:', error);
        res.status(500).json({
            error: "Failed to record privacy policy acceptance",
            message: "Please try again or contact support"
        });
    }
});

// Data Subject Request (GDPR Article 15)
router.post('/data-request', auth, auditLog('data_request'), async (req, res) => {
    try {
        const { requestType, details } = req.body;
        
        const validTypes = ['access', 'deletion', 'correction', 'portability', 'restriction'];
        if (!validTypes.includes(requestType)) {
            return res.status(400).json({
                error: "Invalid request type",
                validTypes,
                legal: {
                    rights: "You have the right to access, correct, delete, port, or restrict your data",
                    processing: "Requests processed within 30 days as required by law"
                }
            });
        }
        
        // Create data request record
        const requestId = `DSR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        LogService.info('Data subject request:', {
            requestId,
            userId: req.user._id,
            type: requestType,
            details,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
        
        // In production, this would trigger a workflow for manual review
        res.json({
            message: "Data subject request received",
            requestId,
            type: requestType,
            status: "pending",
            estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            legal: {
                compliance: "GDPR Article 15-22 rights processing",
                timeline: "Response within 30 days as required by law",
                contact: "dpo@voxkill.com for inquiries",
                verification: "Identity verification may be required"
            },
            nextSteps: [
                "Request logged and assigned unique ID",
                "Identity verification (if required)",
                "Legal team review and processing",
                "Response provided within legal timeframe"
            ]
        });
        
    } catch (error) {
        LogService.error('Data request error:', error);
        res.status(500).json({
            error: "Failed to process data request",
            message: "Please contact our Data Protection Officer directly",
            contact: "dpo@voxkill.com"
        });
    }
});

// Legal compliance status
router.get('/compliance-status', auth, (req, res) => {
    try {
        const user = req.user;
        const currentTermsVersion = "2025-01-06";
        const currentPrivacyVersion = "2025-01-06";
        
        const compliance = {
            userId: user._id,
            timestamp: new Date().toISOString(),
            terms: {
                required: true,
                currentVersion: currentTermsVersion,
                userVersion: user.termsAcceptedVersion || null,
                compliant: user.termsAcceptedVersion === currentTermsVersion,
                acceptedDate: user.termsAcceptedDate || null
            },
            privacy: {
                required: true,
                currentVersion: currentPrivacyVersion,
                userVersion: user.privacyAcceptedVersion || null,
                compliant: user.privacyAcceptedVersion === currentPrivacyVersion,
                acceptedDate: user.privacyAcceptedDate || null
            },
            gdpr: {
                applicable: req.isGDPRSubject || false,
                rights: [
                    "Right to access (Article 15)",
                    "Right to rectification (Article 16)",
                    "Right to erasure (Article 17)",
                    "Right to restrict processing (Article 18)",
                    "Right to data portability (Article 20)",
                    "Right to object (Article 21)"
                ]
            },
            overall: {
                compliant: (user.termsAcceptedVersion === currentTermsVersion) && 
                          (user.privacyAcceptedVersion === currentPrivacyVersion),
                nextAction: null
            }
        };
        
        if (!compliance.overall.compliant) {
            compliance.overall.nextAction = "Accept current Terms of Service and Privacy Policy";
        }
        
        res.json(compliance);
        
    } catch (error) {
        LogService.error('Compliance status error:', error);
        res.status(500).json({
            error: "Failed to check compliance status",
            message: "Please try again or contact support"
        });
    }
});

// Legal disclaimers endpoint
router.get('/disclaimers', addLegalDisclaimers('general'), (req, res) => {
    res.json({
        title: "Legal Disclaimers",
        lastUpdated: "2025-01-06",
        disclaimers: {
            service: {
                availability: "Service provided AS-IS without uptime guarantees",
                accuracy: "AI transcription accuracy not guaranteed",
                liability: "Limited liability as specified in Terms of Service",
                warranties: "No express or implied warranties provided"
            },
            ai: {
                limitations: "AI technology has inherent limitations and biases",
                errors: "AI-generated content may contain errors or inaccuracies",
                training: "AI models trained on publicly available data",
                improvement: "AI models continuously updated and improved"
            },
            thirdParty: {
                services: "Relies on third-party APIs and services",
                availability: "Third-party service availability not guaranteed",
                policies: "Third-party privacy policies and terms apply",
                liability: "Not liable for third-party service issues"
            },
            user: {
                responsibility: "Users responsible for content compliance",
                verification: "Users must verify transcription accuracy",
                backup: "Users responsible for data backup",
                compliance: "Users must comply with applicable laws"
            },
            legal: {
                jurisdiction: "Governed by applicable laws",
                changes: "Terms may change with notice",
                severability: "Invalid provisions do not affect remainder",
                entireAgreement: "Complete agreement between parties"
            }
        }
    });
});

module.exports = router;