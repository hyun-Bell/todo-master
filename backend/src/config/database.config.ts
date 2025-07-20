import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/todomaster',
  ssl: process.env.NODE_ENV === 'production',
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  connectionTimeoutMillis: parseInt(
    process.env.DB_CONNECTION_TIMEOUT || '5000',
    10,
  ),
  // Prisma specific settings
  prisma: {
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  },
}));
