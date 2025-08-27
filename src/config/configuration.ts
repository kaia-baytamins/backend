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

  kaia: {
    rpcUrl: process.env.KAIA_RPC_URL || 'https://public-en-kairos.node.kaia.io',
    chainId: parseInt(process.env.KAIA_CHAIN_ID, 10) || 1001,
    privateKey: process.env.KAIA_PRIVATE_KEY || '',
  },

  contracts: {
    // DeFi Protocol Contracts
    usdt:
      process.env.USDT_CONTRACT_ADDRESS ||
      '0x6283d8384d8f6eaf24ec44d355f31cec0bdace3d',
    staking:
      process.env.STAKING_CONTRACT_ADDRESS ||
      '0x492b504ef0f81e52622087eeb88124de8f2e4819',
    lending:
      process.env.LENDING_CONTRACT_ADDRESS ||
      '0xd24c75020e9fe0763473d4d313aa16955da84468',
    amm:
      process.env.AMM_CONTRACT_ADDRESS ||
      '0x8cc13474301FE5AA08c920dB228A3BB1E68F5b13',
    faucet:
      process.env.FAUCET_CONTRACT_ADDRESS ||
      '0x4e2ebac253d77900cc50dd093f17150ba4437fae',

    // Game Assets Contracts
    nft: process.env.NFT_CONTRACT_ADDRESS || '',
    marketplace: process.env.MARKETPLACE_CONTRACT_ADDRESS || '',
  },

  line: {
    channelId: process.env.LINE_CHANNEL_ID || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3002',
    ],
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
  },
});
