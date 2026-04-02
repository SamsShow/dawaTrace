import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en';
import hi from './locales/hi';
import ta from './locales/ta';
import te from './locales/te';
import bn from './locales/bn';
import mr from './locales/mr';
import gu from './locales/gu';
import kn from './locales/kn';
import ml from './locales/ml';
import pa from './locales/pa';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: '\u0939\u093F\u0902\u0926\u0940' },
  { code: 'ta', label: '\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD' },
  { code: 'te', label: '\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41' },
  { code: 'bn', label: '\u09AC\u09BE\u0982\u09B2\u09BE' },
  { code: 'mr', label: '\u092E\u0930\u093E\u0920\u0940' },
  { code: 'gu', label: '\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0' },
  { code: 'kn', label: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1' },
  { code: 'ml', label: '\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02' },
  { code: 'pa', label: '\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40' },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en }, hi: { translation: hi }, ta: { translation: ta },
      te: { translation: te }, bn: { translation: bn }, mr: { translation: mr },
      gu: { translation: gu }, kn: { translation: kn }, ml: { translation: ml },
      pa: { translation: pa },
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'dawa-lang',
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
