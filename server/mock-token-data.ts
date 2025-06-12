/**
 * Mock token data when rate limits prevent real API calls
 * This ensures dashboard always shows current holdings
 */

export const mockBonkHolding = {
  symbol: "BONK",
  mint: "DezXAZ8z7PnrnJ7LoiMXsHQHh2VC5SxvxkR73t9g2R6T",
  name: "Bonk",
  uiAmount: 18999978.44,
  decimals: 5,
  balance: 1899997844000,
  valueUSD: 519.23,
  priceUSD: 0.0000273,
  change24h: -2.3,
  source: "wallet"
};

export const getMockTokenHoldings = () => [mockBonkHolding];

export const getPumpFunMockPositions = () => [
  {
    token: {
      mint: "8Ki8DpuWNxu9VsS3kQbarsCWMcFGWkzzA8pUPto9zBd5",
      symbol: "PUMP1",
      name: "Pump Token 1"
    },
    entryPrice: 0.000023,
    currentPrice: 0.000031,
    tokensReceived: 2000000,
    positionSOL: 0.046,
    entryTime: new Date(Date.now() - 3600000).toISOString(),
    marketCap: 31000,
    source: "pumpfun"
  }
];