/**
 * REAL PHANTOM WALLET CONFIGURATION
 * Production trading with user's actual Phantom wallet
 */

export const REAL_WALLET_CONFIG = {
  PUBLIC_KEY: '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d',
  PRIVATE_KEY: '3qDnPYLuTxdqj8QRx7FWZoH7UhNcUK9LVYQYd6t2D5THUxwsG8jd4QQXkLrM1LzbMK41hpfgSWj3tQ7PRSnV5RFR',
  NETWORK: 'mainnet-beta',
  TRADING_MODE: 'LIVE_REAL',
  MAX_POSITION_SIZE: 0.27, // SOL per trade
  AUTONOMOUS_TRADING: true,
  CONTINUOUS_SCANNING: true
};

// Override environment variables with real wallet data
process.env.WALLET_PRIVATE_KEY = REAL_WALLET_CONFIG.PRIVATE_KEY;
process.env.PHANTOM_WALLET_ADDRESS = REAL_WALLET_CONFIG.PUBLIC_KEY;
process.env.TRADING_MODE = REAL_WALLET_CONFIG.TRADING_MODE;

console.log('🔓 LIVE REAL WALLET CONFIGURED');
console.log(`📍 Address: ${REAL_WALLET_CONFIG.PUBLIC_KEY}`);
console.log('⚡ Autonomous trading: ENABLED');