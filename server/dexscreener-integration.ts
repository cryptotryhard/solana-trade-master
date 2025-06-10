import fetch from 'node-fetch';

interface DexscreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

interface DexscreenerResponse {
  schemaVersion: string;
  pairs: DexscreenerPair[];
}

interface AlphaToken {
  symbol: string;
  mintAddress: string;
  name: string;
  price: number;
  volume24h: number;
  volumeChange24h: number;
  marketCap: number;
  liquidity: number;
  priceChange1h: number;
  priceChange24h: number;
  confidence: number;
  signals: string[];
  source: string;
  pairAddress?: string;
  createdAt?: Date;
}

class DexscreenerIntegration {
  private baseUrl = 'https://api.dexscreener.com/latest/dex';
  private scanInterval: NodeJS.Timeout | null = null;
  private lastScanTime: Date = new Date();
  private authenticTokens: AlphaToken[] = [];
  
  constructor() {
    this.startContinuousScanning();
  }

  private startContinuousScanning(): void {
    // Scan every 30 seconds for new opportunities
    this.scanInterval = setInterval(() => {
      this.scanForNewTokens();
    }, 30000);
    
    // Initial scan
    this.scanForNewTokens();
  }

  async searchTokens(query: string): Promise<DexscreenerPair[]> {
    try {
      const url = `${this.baseUrl}/search/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as DexscreenerResponse;
      return data.pairs.filter(pair => pair.chainId === 'solana');
    } catch (error) {
      console.error('Error searching Dexscreener tokens:', error);
      return [];
    }
  }

  async getPairInfo(pairAddress: string): Promise<DexscreenerPair | null> {
    try {
      const url = `${this.baseUrl}/pairs/solana/${pairAddress}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as DexscreenerResponse;
      return data.pairs[0] || null;
    } catch (error) {
      console.error('Error fetching pair info:', error);
      return null;
    }
  }

  async scanForNewTokens(): Promise<AlphaToken[]> {
    try {
      console.log('🔍 Scanning Dexscreener for fresh Solana opportunities...');
      
      // Search for recent high-activity pairs
      const searchQueries = ['SOL', 'USDC', 'pump', 'meme'];
      const allPairs: DexscreenerPair[] = [];
      
      for (const query of searchQueries) {
        const pairs = await this.searchTokens(query);
        allPairs.push(...pairs);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Filter and convert to alpha tokens
      const newTokens = this.filterAndConvertPairs(allPairs);
      
      // Update our authentic tokens list
      this.authenticTokens = newTokens;
      
      console.log(`✅ Found ${newTokens.length} authentic Dexscreener opportunities`);
      return newTokens;
      
    } catch (error) {
      console.error('Error scanning Dexscreener:', error);
      return [];
    }
  }

  private filterAndConvertPairs(pairs: DexscreenerPair[]): AlphaToken[] {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    return pairs
      .filter(pair => {
        // Filter criteria for alpha opportunities
        const hasRecentActivity = pair.txns.h1.buys + pair.txns.h1.sells > 10;
        const hasVolume = pair.volume.h24 > 1000; // $1k+ daily volume
        const hasLiquidity = pair.liquidity?.usd && pair.liquidity.usd > 5000; // $5k+ liquidity
        const isRecent = !pair.pairCreatedAt || pair.pairCreatedAt > oneDayAgo;
        const hasPriceData = pair.priceUsd && parseFloat(pair.priceUsd) > 0;
        
        return hasRecentActivity && hasVolume && hasLiquidity && isRecent && hasPriceData;
      })
      .map(pair => this.convertPairToAlphaToken(pair))
      .filter(token => token !== null) as AlphaToken[];
  }

  private convertPairToAlphaToken(pair: DexscreenerPair): AlphaToken | null {
    try {
      const signals: string[] = [];
      
      // Generate signals based on activity
      if (pair.txns.h1.buys > pair.txns.h1.sells * 1.5) {
        signals.push('buying_pressure');
      }
      
      if (pair.priceChange.h1 > 10) {
        signals.push('price_surge');
      }
      
      if (pair.volume.h1 > pair.volume.h6 / 6 * 2) {
        signals.push('volume_spike');
      }
      
      if (pair.liquidity && pair.liquidity.usd > 50000) {
        signals.push('high_liquidity');
      }
      
      // Calculate confidence based on multiple factors
      let confidence = 0;
      confidence += Math.min(pair.txns.h1.buys + pair.txns.h1.sells, 100) / 100 * 30; // Activity score
      confidence += Math.min(pair.volume.h24 / 10000, 1) * 25; // Volume score
      confidence += Math.min((pair.liquidity?.usd || 0) / 100000, 1) * 25; // Liquidity score
      confidence += signals.length * 5; // Signal diversity score
      
      return {
        symbol: pair.baseToken.symbol,
        mintAddress: pair.baseToken.address,
        name: pair.baseToken.name,
        price: parseFloat(pair.priceUsd || '0'),
        volume24h: pair.volume.h24,
        volumeChange24h: pair.priceChange.h24,
        marketCap: pair.marketCap || pair.fdv || 0,
        liquidity: pair.liquidity?.usd || 0,
        priceChange1h: pair.priceChange.h1,
        priceChange24h: pair.priceChange.h24,
        confidence: Math.min(confidence, 95),
        signals,
        source: 'dexscreener_public',
        pairAddress: pair.pairAddress,
        createdAt: pair.pairCreatedAt ? new Date(pair.pairCreatedAt) : new Date()
      };
    } catch (error) {
      console.error('Error converting pair to alpha token:', error);
      return null;
    }
  }

  getAuthenticTokens(): AlphaToken[] {
    return this.authenticTokens;
  }

  getSystemStatus() {
    return {
      service: 'Dexscreener Public API',
      status: 'active',
      lastScan: this.lastScanTime,
      tokensFound: this.authenticTokens.length,
      endpoint: this.baseUrl,
      scanInterval: '30 seconds'
    };
  }

  stop(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }
}

export const dexscreenerIntegration = new DexscreenerIntegration();