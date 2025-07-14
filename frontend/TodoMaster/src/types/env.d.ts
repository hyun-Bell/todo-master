declare module '@env' {
  export const EXPO_PUBLIC_API_URL: string;
  export const EXPO_PUBLIC_APP_NAME: string;
  export const EXPO_PUBLIC_APP_VERSION: string;
  export const EXPO_PUBLIC_ENVIRONMENT: 'development' | 'production' | 'staging';
  export const EXPO_PUBLIC_DEBUG: string;
  export const EXPO_PUBLIC_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}