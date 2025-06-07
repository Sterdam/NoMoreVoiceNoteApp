// frontend/src/i18n/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import frTranslations from './locales/fr.json';
import enTranslations from './locales/en.json';

const resources = {
  fr: {
    translation: frTranslations
  },
  en: {
    translation: enTranslations
  }
};

// Get saved language from localStorage or detect from browser
const getSavedLanguage = () => {
  try {
    const saved = localStorage.getItem('i18nextLng');
    if (saved && (saved === 'fr' || saved === 'en')) {
      return saved;
    }
  } catch (e) {
    // localStorage might not be available
  }
  return null;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(), // Use saved language if available
    fallbackLng: 'fr', // French as default
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      checkWhitelist: true
    },
    
    react: {
      useSuspense: false // Disable suspense to avoid loading issues
    },
    
    // Add missing translations handler
    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler: (lng, ns, key) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation: ${lng}/${ns}/${key}`);
      }
    }
  });

// Listen for language changes and save to localStorage
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('i18nextLng', lng);
    // Update HTML lang attribute
    document.documentElement.lang = lng;
  } catch (e) {
    // localStorage might not be available
  }
});

// Set initial HTML lang attribute
document.documentElement.lang = i18n.language;

export default i18n;