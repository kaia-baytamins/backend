export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'kaia_game',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    expirationTime: process.env.JWT_EXPIRATION_TIME || '24h',
  },

  kaia: {
    rpcUrl: process.env.KAIA_RPC_URL || 'https://public-en.node.kaia.io',
    chainId: parseInt(process.env.KAIA_CHAIN_ID, 10) || 8217,
    privateKey: process.env.KAIA_PRIVATE_KEY || '',
  },

  contracts: {
    staking: process.env.STAKING_CONTRACT_ADDRESS || '',
    nft: process.env.NFT_CONTRACT_ADDRESS || '',
    marketplace: process.env.MARKETPLACE_CONTRACT_ADDRESS || '',
  },

  line: {
    channelId: process.env.LINE_CHANNEL_ID || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
  },
});
