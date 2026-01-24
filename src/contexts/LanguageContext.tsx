import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupportedLanguage, LanguageConfig } from '../types';
import {
  getLanguagePreference,
  saveLanguagePreference,
  SUPPORTED_LANGUAGES,
} from '../storage/language';
import i18n from '../i18n';

interface LanguageContextType {
  selectedLanguage: SupportedLanguage | null;
  languageConfig: LanguageConfig | null;
  isLoading: boolean;
  isFirstTimeSetup: boolean;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  completeFirstTimeSetup: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(true);

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  // Sync language selection with i18n
  useEffect(() => {
    if (selectedLanguage) {
      i18n.changeLanguage(selectedLanguage);
    }
  }, [selectedLanguage]);

  async function loadLanguagePreference() {
    try {
      const preference = await getLanguagePreference();
      if (preference) {
        setSelectedLanguage(preference.selectedLanguage);
        setIsFirstTimeSetup(preference.isFirstTimeSetup);
      }
    } catch (error) {
      console.error('Failed to load language preference:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function setLanguage(language: SupportedLanguage) {
    try {
      await saveLanguagePreference({
        selectedLanguage: language,
        isFirstTimeSetup: false,
      });
      setSelectedLanguage(language);
      setIsFirstTimeSetup(false);
    } catch (error) {
      console.error('Failed to save language:', error);
      throw error;
    }
  }

  async function completeFirstTimeSetup() {
    if (selectedLanguage) {
      await saveLanguagePreference({
        selectedLanguage,
        isFirstTimeSetup: false,
      });
      setIsFirstTimeSetup(false);
    }
  }

  const languageConfig = selectedLanguage ? SUPPORTED_LANGUAGES[selectedLanguage] : null;

  return (
    <LanguageContext.Provider
      value={{
        selectedLanguage,
        languageConfig,
        isLoading,
        isFirstTimeSetup,
        setLanguage,
        completeFirstTimeSetup,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
