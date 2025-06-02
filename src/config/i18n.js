const i18n = require('i18n');
const path = require('path');

i18n.configure({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  queryParameter: 'lang',
  directory: path.join(__dirname, '../locales'),
  objectNotation: true,
  updateFiles: false,
  syncFiles: false,
  indent: '  ',
  api: {
    '__': 't',
    '__n': 'tn'
  }
});

module.exports = i18n;