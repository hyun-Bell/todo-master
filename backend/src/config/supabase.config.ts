import { registerAs } from '@nestjs/config';

export default registerAs('supabase', () => ({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  jwtSecret: process.env.SUPABASE_JWT_SECRET,
  // 추가 Supabase 설정
  auth: {
    autoRefreshToken: process.env.SUPABASE_AUTO_REFRESH_TOKEN !== 'false',
    persistSession: process.env.SUPABASE_PERSIST_SESSION !== 'false',
    detectSessionInUrl: process.env.SUPABASE_DETECT_SESSION_IN_URL !== 'false',
  },
  // RLS (Row Level Security) 설정
  rls: {
    enabled: process.env.SUPABASE_RLS_ENABLED !== 'false',
  },
}));
