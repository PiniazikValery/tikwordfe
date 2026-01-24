import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../storage/language';
import { SupportedLanguage } from '../types';

interface LanguageSelectionScreenProps {
  onComplete?: () => void;
  isFirstTime?: boolean;
}

export default function LanguageSelectionScreen({
  onComplete,
  isFirstTime = false,
}: LanguageSelectionScreenProps) {
  const { t } = useTranslation();
  const { setLanguage, selectedLanguage, isFirstTimeSetup } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [localSelection, setLocalSelection] = useState<SupportedLanguage | null>(
    selectedLanguage
  );

  const languagesList = Object.values(SUPPORTED_LANGUAGES);

  async function handleSelectLanguage(languageCode: SupportedLanguage) {
    setLocalSelection(languageCode);
  }

  async function handleConfirm() {
    if (!localSelection) {
      Alert.alert(
        t('languageSelection.alertSelectTitle'),
        t('languageSelection.alertSelectMessage')
      );
      return;
    }

    setIsLoading(true);
    try {
      // Capture the first-time setup state BEFORE calling setLanguage
      // because setLanguage will change it to false
      const wasFirstTimeSetup = isFirstTimeSetup;

      await setLanguage(localSelection);

      if (onComplete) {
        onComplete();
      } else {
        // Navigate based on whether this was first-time setup
        if (wasFirstTimeSetup) {
          router.replace('/(tabs)');
        } else {
          // Coming from settings - navigate back if possible
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }
      }
    } catch (error) {
      Alert.alert(
        t('languageSelection.alertErrorTitle'),
        t('languageSelection.alertErrorMessage')
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {isFirstTime || isFirstTimeSetup
            ? t('languageSelection.title')
            : t('languageSelection.titleChange')}
        </Text>
        <Text style={styles.subtitle}>
          {isFirstTime || isFirstTimeSetup
            ? t('languageSelection.subtitle')
            : t('languageSelection.subtitleChange')}
        </Text>

        <FlatList
          data={languagesList}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.languageButton,
                localSelection === item.code && styles.languageButtonSelected,
              ]}
              onPress={() => handleSelectLanguage(item.code)}
            >
              <Text style={styles.flagText}>{item.flag}</Text>
              <View style={styles.languageInfo}>
                <Text
                  style={[
                    styles.languageName,
                    localSelection === item.code && styles.languageNameSelected,
                  ]}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.languageNativeName,
                    localSelection === item.code && styles.languageNativeNameSelected,
                  ]}
                >
                  {item.nativeName}
                </Text>
              </View>
              {localSelection === item.code && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity
          style={[
            styles.confirmButton,
            !localSelection && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!localSelection || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {isFirstTime || isFirstTimeSetup
                ? t('languageSelection.getStarted')
                : t('languageSelection.save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  listContent: {
    gap: 12,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  flagText: {
    fontSize: 32,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  languageNameSelected: {
    color: '#007AFF',
  },
  languageNativeName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  languageNativeNameSelected: {
    color: '#007AFF',
  },
  checkmark: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
