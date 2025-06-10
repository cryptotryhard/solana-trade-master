import fetch from 'node-fetch';

interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  twitter?: string;
  telegram?: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  created_timestamp: number;
  raydium_pool?: string;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  website?: string;
  show_name: boolean;
  king_of_the_hill_timestamp?: number;
  market_cap: number;
  reply_count: number;
  last_reply?: number;
  nsfw: boolean;
  market_id?: string;
  inverted?: boolean;
  usd_market_cap: number;
}

interface PumpFunResponse {
  coins: PumpFunToken[];
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
  createdAt?: Date;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };
}

class PumpFunIntegration {
  private baseUrl = 'https://frontend-api.pump.fun';
  private scanInterval: NodeJS.Timeout | null = null;
  private lastScanTime: Date = new Date();
  private authenticTokens: AlphaToken[] = [];
  private seenTokens: Set<string> = new Set();
  
  constructor() {
    this.startContinuousScanning();
  }

  private startContinuousScanning(): void {
    // Scan every 20 seconds for new pump.fun launches
    this.scanInterval = setInterval(() => {
      this.scanForNewLaunches();
    }, 20000);
    
    // Initial scan
    this.scanForNewLaunches();
  }

  async getLatestTokens(limit: number = 50): Promise<PumpFunToken[]> {
    try {
      const url = `${this.baseUrl}/coins?offset=0&limit=${limit}&sort=created_timestamp&order=DESC&includeNsfw=false`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as PumpFunToken[];
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.error('Error fetching Pump.fun tokens:', error);
      return [];
    }
  }

  async getTokenDetails(mintAddress: string): Promise<PumpFunToken | null> {
    try {
      const url = `${this.baseUrl}/coins/${mintAddress}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json() as PumpFunToken;
      return data;
      
    } catch (error) {
      console.error('Error fetching token details:', error);
      return null;
    }
  }

  async scanForNewLaunches(): Promise<AlphaToken[]> {
    try {
      console.log('🚀 Scanning Pump.fun for fresh launches...');
      
      const tokens = await this.getLatestTokens(30);
      
      if (tokens.length === 0) {
        console.log('⚠️ No tokens received from Pump.fun API');
        return [];
      }
      
      // Filter for new and promising tokens
      const newTokens = this.filterPromisingTokens(tokens);
      
      // Update our authentic tokens list
      this.authenticTokens = newTokens;
      this.lastScanTime = new Date();
      
      console.log(`✅ Found ${newTokens.length} promising Pump.fun launches`);
      return newTokens;
      
    } catch (error) {
      console.error('Error scanning Pump.fun:', error);
      return [];
    }
  }

  private filterPromisingTokens(tokens: PumpFunToken[]): AlphaToken[] {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    return tokens
      .filter(token => {
        // Skip if we've already seen this token
        if (this.seenTokens.has(token.mint)) {
          return false;
        }
        
        // Filter criteria for alpha opportunities
        const isRecent = token.created_timestamp > oneHourAgo;
        const hasLiquidity = token.virtual_sol_reserves > 5; // > 5 SOL liquidity
        const hasMarketCap = token.usd_market_cap > 1000; // > $1k market cap
        const notNsfw = !token.nsfw;
        const hasActivity = token.reply_count > 0;
        const notCompleted = !token.complete; // Still in bonding curve phase
        
        if (isRecent && hasLiquidity && hasMarketCap && notNsfw && notCompleted) {
          this.seenTokens.add(token.mint);
          return true;
        }
        
        return false;
      })
      .map(token => this.convertToAlphaToken(token))
      .filter(token => token !== null) as AlphaToken[];
  }

  private convertToAlphaToken(token: PumpFunToken): AlphaToken | null {
    try {
      const signals: string[] = [];
      
      // Generate signals based on pump.fun metrics
      if (token.virtual_sol_reserves > 20) {
        signals.push('high_liquidity_pumpfun');
      }
      
      if (token.reply_count > 10) {
        signals.push('community_engagement');
      }
      
      if (token.twitter || token.telegram || token.website) {
        signals.push('social_presence');
      }
      
      const timeSinceCreation = Date.now() - token.created_timestamp;
      if (timeSinceCreation < 30 * 60 * 1000) { // Less than 30 minutes old
        signals.push('ultra_fresh_launch');
      }
      
      if (token.show_name && token.description?.length > 20) {
        signals.push('proper_branding');
      }
      
      // Calculate confidence based on pump.fun specific factors
      let confidence = 0;
      confidence += Math.min(token.virtual_sol_reserves / 50, 1) * 30; // Liquidity score
      confidence += Math.min(token.usd_market_cap / 50000, 1) * 25; // Market cap score
      confidence += Math.min(token.reply_count / 20, 1) * 20; // Engagement score
      confidence += signals.length * 5; // Signal diversity
      
      // Bonus for social links
      if (token.twitter || token.telegram || token.website) {
        confidence += 10;
      }
      
      // Calculate estimated price (simplified)
      const estimatedPrice = token.usd_market_cap / token.total_supply;
      
      return {
        symbol: token.symbol,
        mintAddress: token.mint,
        name: token.name,
        price: estimatedPrice,
        volume24h: token.virtual_sol_reserves * 1000, // Rough estimate
        volumeChange24h: 0, // Not available from pump.fun
        marketCap: token.usd_market_cap,
        liquidity: token.virtual_sol_reserves * 200, // SOL reserves * approximate SOL price
        priceChange1h: 0, // Not available
        priceChange24h: 0, // Not available
        confidence: Math.min(confidence, 95),
        signals,
        source: 'pumpfun_fresh',
        createdAt: new Date(token.created_timestamp),
        socialLinks: {
          twitter: token.twitter,
          telegram: token.telegram,
          website: token.website
        }
      };
      
    } catch (error) {
      console.error('Error converting pump.fun token:', error);
      return null;
    }
  }

  getAuthenticTokens(): AlphaToken[] {
    return this.authenticTokens;
  }

  getSystemStatus() {
    return {
      service: 'Pump.fun Public API',
      status: 'active',
      lastScan: this.lastScanTime,
      tokensFound: this.authenticTokens.length,
      seenTokensCount: this.seenTokens.size,
      endpoint: this.baseUrl,
      scanInterval: '20 seconds'
    };
  }

  stop(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }
}

export const pumpFunIntegration = new PumpFunIntegration();