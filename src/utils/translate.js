const i18n = require('../config/i18n');

/**
 * Helper function to translate messages
 * @param {string} key - Translation key
 * @param {object} req - Express request object
 * @param {object} params - Optional parameters for interpolation
 * @returns {string} Translated message
 */
const t = (key, req, params = {}) => {
  if (!req || typeof req.__  !== 'function') {
    // Fallback to default locale if req is not available
    return i18n.__({ phrase: key, locale: 'fr' }, params);
  }
  return req.__(key, params);
};

module.exports = { t };