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

  // JWT validation
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRATION_TIME: Joi.string().default('24h'),

  // KAIA blockchain validation
  KAIA_RPC_URL: Joi.string().uri().required(),
  KAIA_CHAIN_ID: Joi.number().default(8217),
  KAIA_PRIVATE_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Contract addresses validation
  STAKING_CONTRACT_ADDRESS: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  NFT_CONTRACT_ADDRESS: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  MARKETPLACE_CONTRACT_ADDRESS: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

  // LINE configuration validation
  LINE_CHANNEL_ID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  LINE_CHANNEL_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // CORS validation
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Rate limiting validation
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
});
