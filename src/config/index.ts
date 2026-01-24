// App configuration that changes based on environment
import Constants from 'expo-constants';

// Get config from expo extra (set in app.config.js from env variables)
const expoExtra = Constants.expoConfig?.extra || {};

// Determine if we should bypass paywall
// Default is FALSE for safety - must explicitly set EXPO_PUBLIC_DEV_MODE_BYPASS=true to bypass
const shouldBypassPaywall = expoExtra.devModeBypass === true;

// Get API key from expo extra
const getRevenueCatApiKey = (): string => {
  const apiKey = expoExtra.revenueCatApiKey;

  if (!apiKey) {
    console.warn(
      "⚠️ EXPO_PUBLIC_REVENUECAT_API_KEY is not set. RevenueCat will not work.",
    );
    return "";
  }

  return apiKey;
};

export const Config = {
  // API Configuration
  api: {
    baseUrl: 'http://tikwordbe.duckdns.org:3000',
  },

  // RevenueCat API Keys
  revenueCat: {
    apiKey: getRevenueCatApiKey(),
    entitlementId: "TikWord Pro",
  },

  // Development mode bypass
  devMode: {
    bypassPaywall: shouldBypassPaywall,
  },

  // App info
  app: {
    name: "TikWord",
    version: "1.0.0",
  },
};
