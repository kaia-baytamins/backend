// USDTStaking Contract ABI
export const USDT_STAKING_ABI = [
  // Core staking functions
  'function stake(uint256 amount)',
  'function unstake(uint256 amount)',
  'function claimRewards()',

  // View functions
  'function stakingToken() view returns (address)',
  'function APY() view returns (uint256)',
  'function SECONDS_PER_YEAR() view returns (uint256)',
  'function totalStaked() view returns (uint256)',
  'function totalRewardsPaid() view returns (uint256)',

  // User info functions
  'function stakes(address user) view returns (uint256 amount, uint256 timestamp, uint256 rewardDebt)',
  'function claimedRewards(address user) view returns (uint256)',
  'function calculateReward(address user) view returns (uint256)',
  'function getStakeInfo(address user) view returns (uint256 amount, uint256 timestamp, uint256 pendingReward, uint256 totalClaimed)',
  'function getTotalStats() view returns (uint256 _totalStaked, uint256 _totalRewardsPaid, uint256 totalUsers)',

  // Admin functions
  'function pause()',
  'function unpause()',
  'function emergencyWithdraw()',
  'function fundRewards(uint256 amount)',
  'function owner() view returns (address)',

  // Events
  'event Staked(address indexed user, uint256 amount)',
  'event Unstaked(address indexed user, uint256 amount)',
  'event RewardClaimed(address indexed user, uint256 reward)',
  'event Paused(address account)',
  'event Unpaused(address account)',
];
