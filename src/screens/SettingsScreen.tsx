import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { useRevenueCat } from '../contexts/RevenueCatContext';
import RevenueCatUI from 'react-native-purchases-ui';
import { Config } from '../config';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { languageConfig } = useLanguage();
  const { hasProAccess, showPaywall } = useRevenueCat();
  const [showDebug, setShowDebug] = useState(false);

  function handleChangeLanguage() {
    router.push('/language-selection');
  }

  async function handleManageSubscription() {
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (error) {
      console.error('Error showing Customer Center:', error);
      Alert.alert(
        t('paywall.errorTitle'),
        t('paywall.errorMessage')
      );
    }
  }

  async function handleUpgrade() {
    await showPaywall();
  }

  // Mask API key for display (show first 10 and last 4 chars)
  const maskApiKey = (key: string) => {
    if (!key || key.length < 20) return key || 'Not set';
    return `${key.slice(0, 10)}...${key.slice(-4)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleChangeLanguage}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>{t('settings.nativeLanguage')}</Text>
              {languageConfig && (
                <Text style={styles.settingValue}>
                  {languageConfig.flag} {languageConfig.nativeName}
                </Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.subscription')}</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleManageSubscription}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>
                {hasProAccess ? 'TikWord Pro' : 'TikWord Free'}
              </Text>
              {hasProAccess && (
                <Text style={styles.settingValue}>
                  {t('settings.subscriptionActive')}
                </Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {!hasProAccess && (
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Text style={styles.upgradeButtonText}>
                {t('settings.upgradeButton')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Debug Section */}
        <View style={styles.section}>
          <TouchableOpacity onPress={() => setShowDebug(!showDebug)}>
            <Text style={styles.sectionTitle}>
              Debug {showDebug ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {showDebug && (
            <View style={styles.debugContainer}>
              <View style={styles.debugItem}>
                <Text style={styles.debugLabel}>__DEV__</Text>
                <Text style={[styles.debugValue, { color: __DEV__ ? '#4CAF50' : '#F44336' }]}>
                  {__DEV__ ? 'true' : 'false'}
                </Text>
              </View>

              <View style={styles.debugItem}>
                <Text style={styles.debugLabel}>Bypass Paywall</Text>
                <Text style={[styles.debugValue, { color: Config.devMode.bypassPaywall ? '#FF9800' : '#4CAF50' }]}>
                  {Config.devMode.bypassPaywall ? 'true' : 'false'}
                </Text>
              </View>

              <View style={styles.debugItem}>
                <Text style={styles.debugLabel}>RevenueCat API Key</Text>
                <Text style={styles.debugValue}>
                  {maskApiKey(Config.revenueCat.apiKey)}
                </Text>
              </View>

              <View style={styles.debugItem}>
                <Text style={styles.debugLabel}>Entitlement ID</Text>
                <Text style={styles.debugValue}>{Config.revenueCat.entitlementId}</Text>
              </View>

              <View style={styles.debugItem}>
                <Text style={styles.debugLabel}>Has Pro Access</Text>
                <Text style={[styles.debugValue, { color: hasProAccess ? '#4CAF50' : '#666' }]}>
                  {hasProAccess ? 'true' : 'false'}
                </Text>
              </View>

              <View style={styles.debugItem}>
                <Text style={styles.debugLabel}>App Version</Text>
                <Text style={styles.debugValue}>{Config.app.version}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  settingLeft: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
    fontWeight: '300',
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
  },
  debugItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  debugLabel: {
    fontSize: 13,
    color: '#888',
    fontFamily: 'monospace',
  },
  debugValue: {
    fontSize: 13,
    color: '#fff',
    fontFamily: 'monospace',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
});
