// src/middlewares/legal.js - Simplified
const LogService = require('../services/LogService');

// Simple legal headers
const addLegalHeaders = (req, res, next) => {
    res.setHeader('X-Legal-Terms', 'https://voxkill.com/terms');
    res.setHeader('X-Privacy-Policy', 'https://voxkill.com/privacy');
    next();
};

// No complex legal checks - just pass through
const validateLegalConsent = (req, res, next) => next();
const validateContentCompliance = (req, res, next) => next();
const checkGDPRCompliance = (req, res, next) => next();
const checkExportCompliance = (req, res, next) => next();
const addLegalDisclaimers = () => (req, res, next) => next();
const auditLog = () => (req, res, next) => next();

module.exports = {
    addLegalHeaders,
    validateLegalConsent,
    validateContentCompliance,
    checkGDPRCompliance,
    checkExportCompliance,
    addLegalDisclaimers,
    auditLog
};