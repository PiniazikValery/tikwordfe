import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportedLanguage, LanguageConfig, LanguagePreference } from '../types';

const LANGUAGE_PREFERENCE_KEY = 'user_language_preference';

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    googleTranslateCode: 'es',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    googleTranslateCode: 'fr',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    googleTranslateCode: 'de',
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    googleTranslateCode: 'ru',
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    googleTranslateCode: 'zh-CN',
  },
};

export async function getLanguagePreference(): Promise<LanguagePreference | null> {
  try {
    const data = await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error loading language preference:', error);
    return null;
  }
}

export async function saveLanguagePreference(preference: LanguagePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, JSON.stringify(preference));
  } catch (error) {
    console.error('Error saving language preference:', error);
    throw error;
  }
}

export async function clearLanguagePreference(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LANGUAGE_PREFERENCE_KEY);
  } catch (error) {
    console.error('Error clearing language preference:', error);
    throw error;
  }
}
