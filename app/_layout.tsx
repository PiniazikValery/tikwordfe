import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LanguageProvider, useLanguage } from '@/src/contexts/LanguageContext';
import { PaywallProvider } from '@/src/contexts/PaywallContext';
import { RevenueCatProvider } from '@/src/contexts/RevenueCatContext';
import '@/src/i18n'; // Initialize i18n

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { isLoading, isFirstTimeSetup, selectedLanguage } = useLanguage();
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Only navigate once when the app first loads
    if (!isLoading && !hasNavigated.current) {
      if (isFirstTimeSetup || !selectedLanguage) {
        // Navigate to language selection
        router.replace('/language-selection');
        hasNavigated.current = true;
      }
      // If language is already set and not first time, stay on current route
      // This allows the router to navigate to tabs naturally
    }
  }, [isLoading, isFirstTimeSetup, selectedLanguage]);

  if (isLoading) {
    // Show blank screen while loading (could add splash screen here)
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="language-selection" options={{ title: 'Select Language' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="video-context" options={{ title: 'Video Context' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RevenueCatProvider>
        <PaywallProvider>
          <LanguageProvider>
            <RootNavigator />
          </LanguageProvider>
        </PaywallProvider>
      </RevenueCatProvider>
    </SafeAreaProvider>
  );
}
