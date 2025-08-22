// LendingProtocol Contract ABI
export const LENDING_PROTOCOL_ABI = [
  // Core lending functions
  'function supply(uint256 amount)',
  'function withdraw(uint256 amount)',
  'function borrow(uint256 amount)',
  'function repay(uint256 amount)',

  // Collateral functions
  'function depositCollateral() payable',
  'function withdrawCollateral(uint256 amount)',

  // Liquidation
  'function liquidate(address user)',

  // Constants
  'function lendingToken() view returns (address)',
  'function SUPPLY_APY() view returns (uint256)',
  'function BORROW_APY() view returns (uint256)',
  'function COLLATERAL_RATIO() view returns (uint256)',
  'function LIQUIDATION_THRESHOLD() view returns (uint256)',
  'function SECONDS_PER_YEAR() view returns (uint256)',

  // State variables
  'function totalSupplied() view returns (uint256)',
  'function totalBorrowed() view returns (uint256)',
  'function totalCollateral() view returns (uint256)',

  // User account info
  'function accounts(address user) view returns (uint256 supplied, uint256 borrowed, uint256 collateral, uint256 lastSupplyUpdate, uint256 lastBorrowUpdate, uint256 accruedSupplyInterest, uint256 accruedBorrowInterest)',
  'function getAccountInfo(address user) view returns (uint256 supplied, uint256 borrowed, uint256 collateral, uint256 pendingSupplyInterest, uint256 pendingBorrowInterest, bool isLiquidatable)',
  'function getAvailableBorrow() view returns (uint256)',
  'function getUtilizationRate() view returns (uint256)',

  // Admin functions
  'function pause()',
  'function unpause()',
  'function owner() view returns (address)',

  // Events
  'event Supplied(address indexed user, uint256 amount)',
  'event Withdrawn(address indexed user, uint256 amount)',
  'event Borrowed(address indexed user, uint256 amount)',
  'event Repaid(address indexed user, uint256 amount)',
  'event CollateralDeposited(address indexed user, uint256 amount)',
  'event CollateralWithdrawn(address indexed user, uint256 amount)',
  'event Liquidated(address indexed user, address indexed liquidator, uint256 debtCovered, uint256 collateralSeized)',
  'event Paused(address account)',
  'event Unpaused(address account)',
];
