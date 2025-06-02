const i18n = require('../config/i18n');

const languageMiddleware = (req, res, next) => {
  // Get language from various sources
  const lang = req.query.lang || 
               req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 
               req.cookies?.lang ||
               'fr';
  
  // Set locale
  const locale = ['fr', 'en'].includes(lang) ? lang : 'fr';
  i18n.setLocale(req, locale);
  
  // Add translation function to response locals
  res.locals.__ = i18n.__;
  res.locals.__n = i18n.__n;
  
  next();
};

module.exports = languageMiddleware;