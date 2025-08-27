import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database validation
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  // KAIA blockchain validation
  KAIA_RPC_URL: Joi.string().uri().required(),
  KAIA_CHAIN_ID: Joi.number().default(1001),
  KAIA_PRIVATE_KEY: Joi.string().optional().allow(''),

  // Contract addresses validation (removed for development)

  // LINE configuration validation (removed for development)
  LINE_CHANNEL_ID: Joi.string().optional().allow(''),
  LINE_CHANNEL_SECRET: Joi.string().optional().allow(''),

  // CORS validation
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Rate limiting validation
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
});
