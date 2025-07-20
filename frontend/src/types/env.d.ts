declare module '@env' {
  export const EXPO_PUBLIC_API_URL: string;
  export const EXPO_PUBLIC_APP_NAME: string;
  export const EXPO_PUBLIC_APP_VERSION: string;
  export const EXPO_PUBLIC_ENVIRONMENT: 'development' | 'production' | 'staging';
  export const EXPO_PUBLIC_DEBUG: string;
  export const EXPO_PUBLIC_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  export const EXPO_PUBLIC_SUPABASE_URL: string;
  export const EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  // 하위 호환성을 위해 기존 변수도 유지
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
}

// Expo 환경 변수 타입 정의
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    EXPO_PUBLIC_API_URL: string;
    EXPO_PUBLIC_ENV?: string;
  }
}