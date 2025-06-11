import fetch from 'node-fetch';

interface BirdeyeTokenData {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  volumeChange24h: number;
  marketCap: number;
  marketCapChange24h: number;
  liquidity: number;
  liquidityChange24h: number;
  holderCount?: number;
  supply: number;
  createdTime?: number;
  riskLevel?: string;
  tags?: string[];
}

interface BirdeyeTopToken {
  address: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  rank: number;
  score: number;
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
  age: number;
  liquidityScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

class BirdeyeScanner {
  private baseUrl = 'https://public-api.birdeye.so';
  private lastScanTime: number = 0;
  private isScanning: boolean = false;
  private discoveredTokens: Map<string, AlphaToken> = new Map();

  constructor() {
    console.log('🦅 Birdeye Scanner initialized - hunting top gainers');
  }

  async scanTopGainers(): Promise<AlphaToken[]> {
    if (this.isScanning) return [];
    
    this.isScanning = true;
    const alphaTokens: AlphaToken[] = [];
    
    try {
      console.log('🔍 BIRDEYE SCAN: Analyzing top gainers...');
      
      // Get trending tokens from Birdeye
      const response = await fetch(`${this.baseUrl}/defi/tokenlist?sort_by=v24hChangePercent&sort_type=desc&offset=0&limit=50`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Victoria-Bot/1.0',
          'X-API-KEY': process.env.BIRDEYE_API_KEY || ''
        }
      });

      if (!response.ok) {
        console.log(`❌ Birdeye API error: ${response.status}`);
        return [];
      }

      const data: any = await response.json();
      const tokens = data.data?.tokens || [];
      console.log(`🎯 BIRDEYE: Found ${tokens.length} trending tokens`);

      // Filter for high-potential tokens
      const filteredTokens = tokens.filter((token: any) => {
        return (
          token.priceChange24h > 20 && // At least 20% gain
          token.volume24h > 50000 && // Minimum volume
          token.marketCap > 10000 && // Minimum market cap
          token.marketCap < 10000000 && // Maximum market cap for moon potential
          token.liquidity > 5000 // Minimum liquidity
        );
      });

      console.log(`⚡ FILTERED: ${filteredTokens.length} high-potential tokens`);

      for (const token of filteredTokens.slice(0, 8)) { // Top 8 candidates
        try {
          const alphaToken = await this.analyzeToken(token);
          if (alphaToken && alphaToken.confidence > 65) {
            alphaTokens.push(alphaToken);
            this.discoveredTokens.set(token.address, alphaToken);
            console.log(`✅ ALPHA DETECTED: ${token.symbol} (${alphaToken.confidence}% confidence)`);
          }
        } catch (error) {
          console.log(`❌ Error analyzing ${token.symbol}:`, error);
        }
      }

      this.lastScanTime = Date.now();
      console.log(`🏆 BIRDEYE RESULTS: ${alphaTokens.length} alpha tokens discovered`);
      
    } catch (error) {
      console.error('💥 Birdeye scanner error:', error);
    } finally {
      this.isScanning = false;
    }

    return alphaTokens;
  }

  private async analyzeToken(token: any): Promise<AlphaToken | null> {
    try {
      let confidence = 60; // Base confidence for trending tokens
      const signals: string[] = [];

      // Price performance analysis
      if (token.priceChange24h > 50) {
        confidence += 20;
        signals.push('Explosive Growth');
      } else if (token.priceChange24h > 30) {
        confidence += 15;
        signals.push('Strong Growth');
      } else if (token.priceChange24h > 20) {
        confidence += 10;
        signals.push('Solid Growth');
      }

      // Volume analysis
      if (token.volumeChange24h > 100) {
        confidence += 15;
        signals.push('Volume Surge');
      } else if (token.volumeChange24h > 50) {
        confidence += 10;
        signals.push('Volume Spike');
      }

      // Market cap sweet spot
      if (token.marketCap > 50000 && token.marketCap < 1000000) {
        confidence += 12;
        signals.push('Sweet Spot MC');
      } else if (token.marketCap > 100000 && token.marketCap < 5000000) {
        confidence += 8;
        signals.push('Good MC Range');
      }

      // Liquidity analysis
      const liquidityRatio = token.liquidity / token.marketCap;
      let liquidityScore = 50;
      
      if (liquidityRatio > 0.15) {
        confidence += 15;
        liquidityScore = 90;
        signals.push('Excellent Liquidity');
      } else if (liquidityRatio > 0.1) {
        confidence += 10;
        liquidityScore = 75;
        signals.push('Strong Liquidity');
      } else if (liquidityRatio > 0.05) {
        confidence += 5;
        liquidityScore = 60;
        signals.push('Fair Liquidity');
      }

      // Risk assessment
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'MEDIUM';
      
      if (token.priceChange24h > 100 || token.marketCap < 50000) {
        riskLevel = 'HIGH';
        confidence -= 5;
      } else if (token.priceChange24h > 200) {
        riskLevel = 'EXTREME';
        confidence -= 10;
      } else if (token.marketCap > 500000 && token.liquidity > 50000) {
        riskLevel = 'LOW';
        confidence += 5;
      }

      // Market cap change consistency
      if (token.marketCapChange24h > 0 && Math.abs(token.marketCapChange24h - token.priceChange24h) < 10) {
        confidence += 8;
        signals.push('Consistent Growth');
      }

      // Age estimation (if available)
      const ageMinutes = token.createdTime ? 
        (Date.now() - token.createdTime * 1000) / (1000 * 60) : 60;

      return {
        symbol: token.symbol,
        mintAddress: token.address,
        name: token.name,
        price: token.price,
        volume24h: token.volume24h,
        marketCap: token.marketCap,
        change24h: token.priceChange24h,
        confidence: Math.min(confidence, 95),
        signals,
        source: 'Birdeye',
        age: ageMinutes,
        liquidityScore,
        riskLevel
      };

    } catch (error) {
      console.error(`Error analyzing token ${token.symbol}:`, error);
      return null;
    }
  }

  async getTokenDetails(mintAddress: string): Promise<BirdeyeTokenData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/defi/token_overview?address=${mintAddress}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Victoria-Bot/1.0',
          'X-API-KEY': process.env.BIRDEYE_API_KEY || ''
        }
      });

      if (!response.ok) return null;
      const data: any = await response.json();
      return data.data as BirdeyeTokenData;
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
    const maxAge = 6 * 60 * 60 * 1000; // 6 hours

    for (const [mint, token] of this.discoveredTokens.entries()) {
      if (now - (token.age * 60 * 1000) > maxAge) {
        this.discoveredTokens.delete(mint);
      }
    }
  }
}

export const birdeyeScanner = new BirdeyeScanner();
export type { AlphaToken, BirdeyeTokenData, BirdeyeTopToken };