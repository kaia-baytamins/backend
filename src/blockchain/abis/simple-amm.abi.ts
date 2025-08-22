// SimpleAMM Contract ABI
export const SIMPLE_AMM_ABI = [
  // Core AMM functions
  'function addLiquidity(uint256 amountADesired, uint256 amountBDesired) returns (uint256 amountA, uint256 amountB, uint256 liquidity)',
  'function removeLiquidity(uint256 liquidity) returns (uint256 amountA, uint256 amountB)',
  'function swapAForB(uint256 amountAIn) returns (uint256 amountBOut)',
  'function swapBForA(uint256 amountBIn) returns (uint256 amountAOut)',

  // View functions
  'function tokenA() view returns (address)',
  'function tokenB() view returns (address)',
  'function reserveA() view returns (uint256)',
  'function reserveB() view returns (uint256)',
  'function totalLiquidity() view returns (uint256)',
  'function FEE_PERCENT() view returns (uint256)',
  'function FEE_DENOMINATOR() view returns (uint256)',

  // User info functions
  'function liquidityBalances(address user) view returns (uint256)',
  'function getReserves() view returns (uint256 _reserveA, uint256 _reserveB)',
  'function getUserLiquidity(address user) view returns (uint256)',
  'function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) pure returns (uint256 amountOut)',

  // Admin functions
  'function pause()',
  'function unpause()',
  'function emergencyWithdraw()',
  'function owner() view returns (address)',

  // Events
  'event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity)',
  'event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity)',
  'event Swap(address indexed user, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut)',
  'event Paused(address account)',
  'event Unpaused(address account)',
];
