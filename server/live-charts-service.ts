import { EventEmitter } from 'events';

interface TokenPricePoint {
  timestamp: number;
  price: number;
  volume: number;
  marketCap: number;
}

interface LiveTokenData {
  symbol: string;
  mintAddress: string;
  name: string;
  currentPrice: number;
  entryPrice?: number;
  change24h: number;
  change1h: number;
  volume24h: number;
  marketCap: number;
  priceHistory: TokenPricePoint[];
  status: 'portfolio' | 'queued' | 'monitoring';
  confidence?: number;
  signals?: string[];
  pnl?: number;
  pnlPercent?: number;
  lastUpdated: number;
}

class LiveChartsService extends EventEmitter {
  private tokenData: Map<string, LiveTokenData> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = false;

  constructor() {
    super();
    this.startPriceTracking();
  }

  private startPriceTracking(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }

    this.isActive = true;
    this.priceUpdateInterval = setInterval(() => {
      this.updateTokenPrices();
    }, 5000); // Update každých 5 sekund

    console.log('📊 Live Charts Service started - tracking token prices');
  }

  private async updateTokenPrices(): Promise<void> {
    if (!this.isActive) return;

    try {
      // Update prices for all tracked tokens
      for (const [mintAddress, tokenData] of this.tokenData) {
        await this.fetchLatestPrice(tokenData);
      }
    } catch (error) {
      console.error('Failed to update token prices:', error);
    }
  }

  private async fetchLatestPrice(tokenData: LiveTokenData): Promise<void> {
    try {
      // Simulace cenových dat s realistickým pohybem
      const lastPrice = tokenData.priceHistory.length > 0 
        ? tokenData.priceHistory[tokenData.priceHistory.length - 1].price
        : tokenData.currentPrice;

      // Generuj realistický price movement (-5% až +5%)
      const volatility = this.calculateVolatility(tokenData.symbol);
      const priceChange = (Math.random() - 0.5) * volatility * lastPrice;
      const newPrice = Math.max(lastPrice + priceChange, lastPrice * 0.001); // Minimum price protection

      // Update volume s realistickými vzorci
      const volumeMultiplier = 0.8 + Math.random() * 0.4; // 80%-120% of base volume
      const newVolume = tokenData.volume24h * volumeMultiplier;

      // Calculate market cap
      const newMarketCap = this.estimateMarketCap(tokenData.symbol, newPrice);

      // Add new price point
      const pricePoint: TokenPricePoint = {
        timestamp: Date.now(),
        price: newPrice,
        volume: newVolume,
        marketCap: newMarketCap
      };

      // Udržuj pouze posledních 100 bodů (8+ hodin dat)
      tokenData.priceHistory.push(pricePoint);
      if (tokenData.priceHistory.length > 100) {
        tokenData.priceHistory.shift();
      }

      // Update current values
      tokenData.currentPrice = newPrice;
      tokenData.volume24h = newVolume;
      tokenData.marketCap = newMarketCap;
      tokenData.lastUpdated = Date.now();

      // Calculate changes
      if (tokenData.priceHistory.length >= 12) { // 1 hodina dat
        const hourAgoPrice = tokenData.priceHistory[tokenData.priceHistory.length - 12].price;
        tokenData.change1h = ((newPrice - hourAgoPrice) / hourAgoPrice) * 100;
      }

      // Calculate P&L if we have entry price
      if (tokenData.entryPrice) {
        tokenData.pnl = (newPrice - tokenData.entryPrice) * 1000; // Assume 1000 tokens
        tokenData.pnlPercent = ((newPrice - tokenData.entryPrice) / tokenData.entryPrice) * 100;
      }

      this.emit('priceUpdate', tokenData);
    } catch (error) {
      console.error(`Failed to fetch price for ${tokenData.symbol}:`, error);
    }
  }

  private calculateVolatility(symbol: string): number {
    // Různé volatility pro různé typy tokenů
    const volatilityMap: Record<string, number> = {
      'BONK': 0.03,     // 3% volatility
      'SOLEND': 0.04,   // 4% volatility  
      'MOONSHOT': 0.15, // 15% volatility (memecoin)
      'WIF': 0.08,      // 8% volatility
      'BOME': 0.12,     // 12% volatility
      'MYRO': 0.10      // 10% volatility
    };

    return volatilityMap[symbol] || 0.06; // Default 6%
  }

  private estimateMarketCap(symbol: string, price: number): number {
    // Realistic market cap estimates based on token type
    const marketCapEstimates: Record<string, number> = {
      'BONK': 2500000000,    // 2.5B (large cap)
      'SOLEND': 180000000,   // 180M (mid cap)
      'MOONSHOT': 45000000,  // 45M (small cap memecoin)
      'WIF': 890000000,      // 890M (large memecoin)
      'BOME': 325000000,     // 325M (mid cap)
      'MYRO': 420000000      // 420M (mid cap)
    };

    return marketCapEstimates[symbol] || 50000000; // Default 50M
  }

  public addToken(token: {
    symbol: string;
    mintAddress: string;
    name?: string;
    currentPrice: number;
    entryPrice?: number;
    volume24h?: number;
    marketCap?: number;
    status: 'portfolio' | 'queued' | 'monitoring';
    confidence?: number;
    signals?: string[];
  }): void {
    const tokenData: LiveTokenData = {
      symbol: token.symbol,
      mintAddress: token.mintAddress,
      name: token.name || token.symbol,
      currentPrice: token.currentPrice,
      entryPrice: token.entryPrice,
      change24h: Math.random() * 20 - 10, // Random initial change
      change1h: 0,
      volume24h: token.volume24h || 100000,
      marketCap: token.marketCap || this.estimateMarketCap(token.symbol, token.currentPrice),
      priceHistory: [{
        timestamp: Date.now(),
        price: token.currentPrice,
        volume: token.volume24h || 100000,
        marketCap: token.marketCap || this.estimateMarketCap(token.symbol, token.currentPrice)
      }],
      status: token.status,
      confidence: token.confidence,
      signals: token.signals || [],
      lastUpdated: Date.now()
    };

    this.tokenData.set(token.mintAddress, tokenData);
    console.log(`📊 Added ${token.symbol} to live charts tracking`);
  }

  public updateTokenStatus(mintAddress: string, status: 'portfolio' | 'queued' | 'monitoring'): void {
    const token = this.tokenData.get(mintAddress);
    if (token) {
      token.status = status;
      this.emit('statusUpdate', token);
    }
  }

  public removeToken(mintAddress: string): void {
    if (this.tokenData.delete(mintAddress)) {
      console.log(`📊 Removed token ${mintAddress} from live charts tracking`);
    }
  }

  public getTokenData(mintAddress: string): LiveTokenData | undefined {
    return this.tokenData.get(mintAddress);
  }

  public getAllTokens(): LiveTokenData[] {
    return Array.from(this.tokenData.values()).sort((a, b) => b.lastUpdated - a.lastUpdated);
  }

  public getTokensByStatus(status: 'portfolio' | 'queued' | 'monitoring'): LiveTokenData[] {
    return this.getAllTokens().filter(token => token.status === status);
  }

  public initializeFromPortfolio(positions: any[]): void {
    // Initialize tracking for current portfolio positions
    positions.forEach(position => {
      if (!this.tokenData.has(position.mintAddress || position.symbol)) {
        this.addToken({
          symbol: position.symbol,
          mintAddress: position.mintAddress || position.symbol,
          name: position.name || position.symbol,
          currentPrice: position.currentPrice || 0.000001,
          entryPrice: position.entryPrice,
          volume24h: position.volume24h || 100000,
          marketCap: position.marketCap || 50000000,
          status: 'portfolio',
          confidence: position.confidence
        });
      }
    });
  }

  public initializeFromQueue(queuedTrades: any[]): void {
    // Initialize tracking for queued trades
    queuedTrades.forEach(trade => {
      if (!this.tokenData.has(trade.token?.mintAddress || trade.symbol)) {
        this.addToken({
          symbol: trade.token?.symbol || trade.symbol,
          mintAddress: trade.token?.mintAddress || trade.symbol,
          name: trade.token?.name || trade.symbol,
          currentPrice: trade.token?.price || 0.000001,
          volume24h: trade.token?.volume24h || 100000,
          marketCap: trade.token?.marketCap || 50000000,
          status: 'queued',
          confidence: trade.token?.confidence,
          signals: trade.token?.signals
        });
      }
    });
  }

  public stop(): void {
    this.isActive = false;
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
    console.log('📊 Live Charts Service stopped');
  }
}

export const liveChartsService = new LiveChartsService();

// Auto-initialize with some demo data
liveChartsService.addToken({
  symbol: 'BONK',
  mintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  name: 'Bonk',
  currentPrice: 0.000012,
  entryPrice: 0.000008,
  volume24h: 2500000,
  marketCap: 2500000000,
  status: 'portfolio',
  confidence: 82,
  signals: ['Volume Spike', 'Social Trend']
});

liveChartsService.addToken({
  symbol: 'SOLEND',
  mintAddress: 'SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp',
  name: 'Solend',
  currentPrice: 0.52,
  entryPrice: 0.45,
  volume24h: 890000,
  marketCap: 180000000,
  status: 'portfolio',
  confidence: 75,
  signals: ['DeFi Growth', 'Technical Pattern']
});