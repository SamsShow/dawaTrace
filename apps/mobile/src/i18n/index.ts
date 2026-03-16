import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';

// TODO: Add remaining 9 languages (ta, te, bn, mr, gu, kn, ml, pa, or)

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: 'hi', // Default to Hindi
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
