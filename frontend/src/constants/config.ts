// API 설정
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// 환경 설정
export const isDevelopment = process.env.EXPO_PUBLIC_ENV === 'development';
export const isProduction = process.env.EXPO_PUBLIC_ENV === 'production';

// 앱 설정
export const APP_NAME = 'Todo Master';
export const APP_VERSION = '1.0.0';

// 타임아웃 설정
export const API_TIMEOUT = 30000; // 30초
export const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14분