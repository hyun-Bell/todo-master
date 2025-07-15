import Constants from 'expo-constants';

export const getConfig = () => {
  return {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    appName: process.env.EXPO_PUBLIC_APP_NAME || 'TodoMaster',
    appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    environment: (process.env.EXPO_PUBLIC_ENVIRONMENT as 'development' | 'production' | 'staging') || 'development',
    isDebug: process.env.EXPO_PUBLIC_DEBUG === 'true',
    logLevel: (process.env.EXPO_PUBLIC_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  };
};

export const isDevelopment = () => {
  const config = getConfig();
  return config.environment === 'development';
};

export const isProduction = () => {
  const config = getConfig();
  return config.environment === 'production';
};

export const isDebugMode = () => {
  const config = getConfig();
  return config.isDebug && isDevelopment();
};