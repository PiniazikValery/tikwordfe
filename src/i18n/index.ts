import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './resources/en/translation.json';
import es from './resources/es/translation.json';
import fr from './resources/fr/translation.json';
import de from './resources/de/translation.json';
import ru from './resources/ru/translation.json';
import zh from './resources/zh/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      ru: { translation: ru },
      zh: { translation: zh },
    },
    lng: 'en', // Initial fallback
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    compatibilityJSON: 'v3', // For i18next v21+
  });

export default i18n;
