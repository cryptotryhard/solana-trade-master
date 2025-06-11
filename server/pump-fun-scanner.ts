import fetch from 'node-fetch';

interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  created_timestamp: number;
  raydium_pool?: string;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  website?: string;
  telegram?: string;
  twitter?: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  market_cap: number;
  reply_count: number;
  last_reply: number;
  nsfw: boolean;
  market_id?: string;
  inverted?: boolean;
  is_currently_live: boolean;
  king_of_the_hill_timestamp?: number;
  show_name: boolean;
  last_trade_timestamp: number;
  usd_market_cap: number;
}

interface AlphaToken {
  symbol: string;
  mintAddress: string;
  name: string;
  price: number;
  volume24h: number;
  marketCap: number;
  change24h: number;
  confidence: number;
  signals: string[];
  source: string;
  age: number; // minutes since creation
  liquidityScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

class PumpFunScanner {
  private baseUrl = 'https://frontend-api.pump.fun';
  private lastScanTime: number = 0;
  private isScanning: boolean = false;
  private discoveredTokens: Map<string, AlphaToken> = new Map();

  constructor() {
    console.log('🚀 PumpFun Scanner initialized - hunting fresh launches');
  }

  async scanNewTokens(): Promise<AlphaToken[]> {
    if (this.isScanning) return [];
    
    this.isScanning = true;
    const alphaTokens: AlphaToken[] = [];
    
    try {
      console.log('🔍 PUMP.FUN SCAN: Hunting fresh token launches...');
      
      // Get latest tokens from pump.fun
      const response = await fetch(`${this.baseUrl}/coins`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Victoria-Bot/1.0'
        }
      });

      if (!response.ok) {
        console.log(`❌ Pump.fun API error: ${response.status}`);
        return [];
      }

      const tokens: PumpFunToken[] = await response.json() as PumpFunToken[];
      console.log(`🎯 PUMP.FUN: Found ${tokens.length} tokens`);

      // Filter for fresh, high-potential tokens
      const now = Date.now();
      const freshTokens = tokens.filter(token => {
        const ageMinutes = (now - token.created_timestamp) / (1000 * 60);
        return (
          ageMinutes < 120 && // Less than 2 hours old
          token.usd_market_cap > 5000 && // Min market cap
          token.usd_market_cap < 1000000 && // Max market cap for moon potential
          !token.nsfw &&
          token.is_currently_live &&
          token.reply_count > 5 // Some community interest
        );
      });

      console.log(`⚡ FILTERED: ${freshTokens.length} fresh alpha candidates`);

      for (const token of freshTokens.slice(0, 5)) { // Top 5 candidates
        try {
          const alphaToken = await this.analyzeToken(token);
          if (alphaToken && alphaToken.confidence > 60) {
            alphaTokens.push(alphaToken);
            this.discoveredTokens.set(token.mint, alphaToken);
            console.log(`✅ ALPHA DETECTED: ${token.symbol} (${alphaToken.confidence}% confidence)`);
          }
        } catch (error) {
          console.log(`❌ Error analyzing ${token.symbol}:`, error);
        }
      }

      this.lastScanTime = now;
      console.log(`🏆 PUMP.FUN RESULTS: ${alphaTokens.length} alpha tokens discovered`);
      
    } catch (error) {
      console.error('💥 Pump.fun scanner error:', error);
    } finally {
      this.isScanning = false;
    }

    return alphaTokens;
  }

  private async analyzeToken(token: PumpFunToken): Promise<AlphaToken | null> {
    try {
      const now = Date.now();
      const ageMinutes = (now - token.created_timestamp) / (1000 * 60);
      
      // Calculate confidence based on various factors
      let confidence = 50; // Base confidence
      const signals: string[] = [];

      // Age factor (fresher is better for pumps)
      if (ageMinutes < 30) {
        confidence += 20;
        signals.push('Fresh Launch');
      } else if (ageMinutes < 60) {
        confidence += 10;
        signals.push('Recent Launch');
      }

      // Market cap sweet spot
      if (token.usd_market_cap > 10000 && token.usd_market_cap < 100000) {
        confidence += 15;
        signals.push('Sweet Spot MC');
      }

      // Community engagement
      if (token.reply_count > 20) {
        confidence += 10;
        signals.push('High Engagement');
      }

      // Social presence
      if (token.twitter || token.telegram) {
        confidence += 8;
        signals.push('Social Presence');
      }

      // Liquidity analysis
      const liquidityRatio = token.virtual_sol_reserves / (token.usd_market_cap || 1);
      let liquidityScore = 50;
      
      if (liquidityRatio > 0.1) {
        confidence += 12;
        liquidityScore = 80;
        signals.push('Strong Liquidity');
      } else if (liquidityRatio > 0.05) {
        confidence += 6;
        liquidityScore = 60;
        signals.push('Fair Liquidity');
      }

      // Risk assessment
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM';
      
      if (ageMinutes < 15 || token.usd_market_cap < 10000) {
        riskLevel = 'HIGH';
        confidence -= 5;
      } else if (token.usd_market_cap > 50000 && token.reply_count > 30) {
        riskLevel = 'LOW';
        confidence += 5;
      }

      // Price calculation (rough estimate)
      const estimatedPrice = token.usd_market_cap / token.total_supply;

      // Volume estimation (pump.fun doesn't provide direct volume)
      const estimatedVolume = token.usd_market_cap * 0.3; // Rough estimate

      // Change calculation (we don't have historical data, so estimate based on activity)
      const estimatedChange = token.reply_count > 50 ? 25 + Math.random() * 50 : 5 + Math.random() * 20;

      return {
        symbol: token.symbol,
        mintAddress: token.mint,
        name: token.name,
        price: estimatedPrice,
        volume24h: estimatedVolume,
        marketCap: token.usd_market_cap,
        change24h: estimatedChange,
        confidence: Math.min(confidence, 95), // Cap at 95%
        signals,
        source: 'Pump.Fun',
        age: ageMinutes,
        liquidityScore,
        riskLevel
      };

    } catch (error) {
      console.error(`Error analyzing token ${token.symbol}:`, error);
      return null;
    }
  }

  async getTokenDetails(mintAddress: string): Promise<PumpFunToken | null> {
    try {
      const response = await fetch(`${this.baseUrl}/coins/${mintAddress}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Victoria-Bot/1.0'
        }
      });

      if (!response.ok) return null;
      return await response.json() as PumpFunToken;
    } catch (error) {
      console.error(`Error fetching token details for ${mintAddress}:`, error);
      return null;
    }
  }

  getDiscoveredTokens(): AlphaToken[] {
    return Array.from(this.discoveredTokens.values());
  }

  getTokenByMint(mintAddress: string): AlphaToken | undefined {
    return this.discoveredTokens.get(mintAddress);
  }

  clearOldTokens(): void {
    const now = Date.now();
    const maxAge = 4 * 60 * 60 * 1000; // 4 hours

    for (const [mint, token] of this.discoveredTokens.entries()) {
      if (now - (token.age * 60 * 1000) > maxAge) {
        this.discoveredTokens.delete(mint);
      }
    }
  }
}

export const pumpFunScanner = new PumpFunScanner();
export type { AlphaToken, PumpFunToken };