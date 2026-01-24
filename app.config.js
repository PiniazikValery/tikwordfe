// Dynamic Expo config that properly reads environment variables
module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      // Pass environment variables to the app
      devModeBypass: process.env.EXPO_PUBLIC_DEV_MODE_BYPASS === 'true',
      revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '',
    },
  };
};
