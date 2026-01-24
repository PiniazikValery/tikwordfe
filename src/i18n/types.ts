import type en from './resources/en/translation.json';

export type TranslationKeys = typeof en;

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: TranslationKeys;
    };
  }
}
