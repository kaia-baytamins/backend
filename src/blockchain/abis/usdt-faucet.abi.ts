// USDTFaucet Contract ABI
export const USDT_FAUCET_ABI = [
  // Core faucet functions
  'function requestTokens()',
  'function requestTokensFor(address recipient)',

  // View functions
  'function usdtToken() view returns (address)',
  'function FAUCET_AMOUNT() view returns (uint256)',
  'function COOLDOWN_PERIOD() view returns (uint256)',
  'function totalDistributed() view returns (uint256)',

  // User info functions
  'function lastRequestTime(address user) view returns (uint256)',
  'function canRequestTokens(address user) view returns (bool)',
  'function getTimeUntilNextRequest(address user) view returns (uint256)',

  // Admin functions
  'function pause()',
  'function unpause()',
  'function emergencyWithdraw()',
  'function updateFaucetAmount(uint256 newAmount)',
  'function updateCooldownPeriod(uint256 newPeriod)',
  'function owner() view returns (address)',

  // Events
  'event TokensRequested(address indexed user, uint256 amount)',
  'event FaucetAmountUpdated(uint256 oldAmount, uint256 newAmount)',
  'event CooldownPeriodUpdated(uint256 oldPeriod, uint256 newPeriod)',
  'event Paused(address account)',
  'event Unpaused(address account)',
];
