import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(5001),
  API_PREFIX: Joi.string().default('api'),
  API_VERSION: Joi.string().default('v1'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:8081'),

  // Database configuration
  DATABASE_URL: Joi.string().required(),
  DB_POOL_SIZE: Joi.number().min(1).max(100).default(10),
  DB_CONNECTION_TIMEOUT: Joi.number().min(1000).default(5000),

  // Auth configuration
  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_SALT_ROUNDS: Joi.number().min(10).max(20).default(10),

  // Supabase configuration
  SUPABASE_URL: Joi.string().uri().when('NODE_ENV', {
    is: 'test',
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  SUPABASE_ANON_KEY: Joi.string().when('NODE_ENV', {
    is: 'test',
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().when('NODE_ENV', {
    is: 'test',
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  SUPABASE_JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'test',
    then: Joi.optional(),
    otherwise: Joi.optional(),
  }),

  // CORS configuration
  CORS_ENABLED: Joi.boolean().default(true),
  CORS_ORIGINS: Joi.string().optional(),
  CORS_CREDENTIALS: Joi.boolean().default(true),

  // Logging configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  LOG_PRETTY: Joi.boolean().default(false),

  // Rate limiting (optional for now)
  RATE_LIMIT_TTL: Joi.number().min(1).default(60),
  RATE_LIMIT_MAX: Joi.number().min(1).default(100),

  // Password policy
  PASSWORD_MIN_LENGTH: Joi.number().min(6).max(32).default(8),
  PASSWORD_REQUIRE_UPPERCASE: Joi.boolean().default(false),
  PASSWORD_REQUIRE_LOWERCASE: Joi.boolean().default(false),
  PASSWORD_REQUIRE_NUMBERS: Joi.boolean().default(false),
  PASSWORD_REQUIRE_SPECIAL: Joi.boolean().default(false),
});
