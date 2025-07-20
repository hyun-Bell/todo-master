import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  apiVersion: process.env.API_VERSION || 'v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8081',
  // CORS 설정
  cors: {
    enabled: process.env.CORS_ENABLED !== 'false',
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : (() => {
          if (process.env.NODE_ENV === 'production') {
            return ['https://your-app-domain.com'];
          }
          return ['http://localhost:3000', 'http://localhost:8081'];
        })(),
    credentials: process.env.CORS_CREDENTIALS !== 'false',
  },
  // 로깅 설정
  logging: {
    level:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    pretty: process.env.LOG_PRETTY === 'true',
  },
  // Rate Limiting 설정 (나중에 사용할 예정)
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
}));
