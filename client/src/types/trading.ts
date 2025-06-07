export interface CryptoPrice {
  symbol: string;
  name?: string;
  price: number;
  change24h: number;
  image?: string;
}

export interface WalletConnection {
  connected: boolean;
  address?: string;
  balance?: number;
}

export interface TradingBotStatus {
  active: boolean;
  winRate: number;
  tradesToday: number;
  totalTrades: number;
}

export interface MarketSentiment {
  score: number;
  label: string;
  fearGreed: number;
  volumeTrend: 'increasing' | 'decreasing' | 'stable';
  socialBuzz: 'high' | 'medium' | 'low';
}

export interface WebSocketMessage {
  type: 'NEW_TRADE' | 'NEW_RECOMMENDATION' | 'PRICE_UPDATE' | 'BOT_STATUS';
  data: any;
}
