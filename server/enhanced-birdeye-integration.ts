import { birdeyeScanner } from './birdeye-scanner';
import { aiTradingEngine } from './ai-trading-engine';
import { alphaAccelerationEngine } from './alpha-acceleration-engine';

interface EnhancedAlphaToken {
  symbol: string;
  mintAddress: string;
  price: number;
  volume24h: number;
  volumeChange24h: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  priceChange1h: number;
  priceChange24h: number;
  lastTradeTime: number;
  authenticity: 'real' | 'synthetic';
  alphaScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  tradingSignals: string[];
}

class EnhancedBirdeyeIntegration {
  private isActive: boolean = true;
  private scanInterval: NodeJS.Timeout | null = null;
  private lastScanTime: number = 0;
  private authenticTokenCache: Map<string, EnhancedAlphaToken> = new Map();

  constructor() {
    this.startEnhancedScanning();
  }

  private startEnhancedScanning(): void {
    console.log('🚀 Enhanced Birdeye Integration: Starting authentic data collection');
    
    this.scanInterval = setInterval(async () => {
      await this.performEnhancedScan();
    }, 45000); // Every 45 seconds to respect rate limits

    // Initial scan
    this.performEnhancedScan();
  }

  private async performEnhancedScan(): Promise<void> {
    if (!this.isActive) return;

    try {
      console.log('🔍 Enhanced Birdeye Scan: Collecting authentic market data');
      
      // Get fresh tokens from Birdeye with authentic data
      const birdeyeTokens = await birdeyeScanner.getNewTokens(50);
      const enhancedTokens: EnhancedAlphaToken[] = [];

      for (const token of birdeyeTokens.slice(0, 20)) {
        try {
          // Get detailed overview for each token
          const overview = await birdeyeScanner.getTokenOverview(token.address);
          if (!overview) continue;

          // Calculate token freshness and quality metrics
          const now = Date.now() / 1000;
          const lastTradeMinutes = (now - overview.lastTradeUnixTime) / 60;
          
          // Filter for high-potential tokens
          if (lastTradeMinutes > 30) continue; // Only very fresh tokens
          if (overview.volume24h < 1000) continue; // Minimum volume threshold
          if (overview.liquidity < 5000) continue; // Minimum liquidity
          
          // Calculate alpha score based on authentic metrics
          const alphaScore = this.calculateAlphaScore({
            volume24h: overview.volume24h,
            liquidity: overview.liquidity,
            uniqueWallets: overview.uniqueWallet24h,
            priceChange24h: overview.priceChange24h,
            lastTradeMinutes
          });

          // Generate trading signals based on real data
          const tradingSignals = this.generateTradingSignals({
            volume24h: overview.volume24h,
            priceChange24h: overview.priceChange24h,
            liquidity: overview.liquidity,
            uniqueWallets: overview.uniqueWallet24h
          });

          const enhancedToken: EnhancedAlphaToken = {
            symbol: token.symbol || `TOKEN_${token.address.slice(0, 8)}`,
            mintAddress: token.address,
            price: overview.price,
            volume24h: overview.volume24h,
            volumeChange24h: 0, // Would need historical data
            marketCap: overview.marketCap,
            liquidity: overview.liquidity,
            holders: overview.uniqueWallet24h,
            priceChange1h: 0, // Would need hourly data
            priceChange24h: overview.priceChange24h,
            lastTradeTime: overview.lastTradeUnixTime,
            authenticity: 'real',
            alphaScore,
            riskLevel: this.assessRiskLevel(overview),
            tradingSignals
          };

          enhancedTokens.push(enhancedToken);
          this.authenticTokenCache.set(token.address, enhancedToken);

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (tokenError) {
          console.log(`Error processing token ${token.symbol}:`, tokenError);
          continue;
        }
      }

      if (enhancedTokens.length > 0) {
        console.log(`✅ Enhanced Scan: Found ${enhancedTokens.length} authentic alpha opportunities`);
        
        // Send high-quality opportunities to trading engine
        const highAlphaTokens = enhancedTokens.filter(token => 
          token.alphaScore > 75 && token.riskLevel !== 'high'
        );

        if (highAlphaTokens.length > 0) {
          console.log(`🎯 High Alpha Opportunities: ${highAlphaTokens.length} tokens with score >75`);
          await this.notifyTradingEngine(highAlphaTokens);
        }
      }

      this.lastScanTime = Date.now();
    } catch (error) {
      console.error('Enhanced Birdeye scan error:', error);
    }
  }

  private calculateAlphaScore(metrics: {
    volume24h: number;
    liquidity: number;
    uniqueWallets: number;
    priceChange24h: number;
    lastTradeMinutes: number;
  }): number {
    let score = 0;

    // Volume scoring (0-25 points)
    if (metrics.volume24h > 50000) score += 25;
    else if (metrics.volume24h > 10000) score += 20;
    else if (metrics.volume24h > 5000) score += 15;
    else if (metrics.volume24h > 1000) score += 10;

    // Liquidity scoring (0-20 points)
    if (metrics.liquidity > 100000) score += 20;
    else if (metrics.liquidity > 50000) score += 15;
    else if (metrics.liquidity > 20000) score += 10;
    else if (metrics.liquidity > 5000) score += 5;

    // Activity scoring (0-25 points)
    if (metrics.uniqueWallets > 50) score += 25;
    else if (metrics.uniqueWallets > 20) score += 20;
    else if (metrics.uniqueWallets > 10) score += 15;
    else if (metrics.uniqueWallets > 5) score += 10;

    // Price momentum (0-20 points)
    if (metrics.priceChange24h > 100) score += 20;
    else if (metrics.priceChange24h > 50) score += 15;
    else if (metrics.priceChange24h > 20) score += 10;
    else if (metrics.priceChange24h > 0) score += 5;

    // Freshness bonus (0-10 points)
    if (metrics.lastTradeMinutes < 5) score += 10;
    else if (metrics.lastTradeMinutes < 10) score += 7;
    else if (metrics.lastTradeMinutes < 20) score += 5;

    return Math.min(100, score);
  }

  private generateTradingSignals(metrics: {
    volume24h: number;
    priceChange24h: number;
    liquidity: number;
    uniqueWallets: number;
  }): string[] {
    const signals: string[] = [];

    if (metrics.volume24h > 20000) signals.push('HIGH_VOLUME');
    if (metrics.priceChange24h > 50) signals.push('STRONG_MOMENTUM');
    if (metrics.liquidity > 50000) signals.push('GOOD_LIQUIDITY');
    if (metrics.uniqueWallets > 20) signals.push('STRONG_INTEREST');
    if (metrics.volume24h > 10000 && metrics.priceChange24h > 20) signals.push('BREAKOUT_PATTERN');

    return signals;
  }

  private assessRiskLevel(overview: any): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Low liquidity increases risk
    if (overview.liquidity < 10000) riskScore += 2;
    else if (overview.liquidity < 25000) riskScore += 1;

    // Low holder count increases risk
    if (overview.uniqueWallet24h < 5) riskScore += 2;
    else if (overview.uniqueWallet24h < 15) riskScore += 1;

    // Extreme price changes can indicate manipulation
    if (Math.abs(overview.priceChange24h) > 500) riskScore += 2;
    else if (Math.abs(overview.priceChange24h) > 200) riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private async notifyTradingEngine(tokens: EnhancedAlphaToken[]): Promise<void> {
    for (const token of tokens) {
      try {
        // Convert to format expected by trading engine
        const tokenMetrics = {
          symbol: token.symbol,
          mintAddress: token.mintAddress,
          price: token.price,
          volume24h: token.volume24h,
          marketCap: token.marketCap,
          liquidity: token.liquidity,
          signals: token.tradingSignals,
          confidence: token.alphaScore / 100,
          source: 'birdeye_authentic'
        };

        // Send to AI trading engine for analysis
        if (typeof aiTradingEngine?.analyzeToken === 'function') {
          await aiTradingEngine.analyzeToken(tokenMetrics);
        }
      } catch (error) {
        console.error(`Error notifying trading engine for ${token.symbol}:`, error);
      }
    }
  }

  public getAuthenticTokens(): EnhancedAlphaToken[] {
    return Array.from(this.authenticTokenCache.values())
      .sort((a, b) => b.alphaScore - a.alphaScore)
      .slice(0, 20);
  }

  public getSystemStatus(): {
    isActive: boolean;
    lastScanTime: number;
    authenticTokenCount: number;
    highAlphaCount: number;
  } {
    const tokens = Array.from(this.authenticTokenCache.values());
    const highAlphaCount = tokens.filter(t => t.alphaScore > 75).length;

    return {
      isActive: this.isActive,
      lastScanTime: this.lastScanTime,
      authenticTokenCount: tokens.length,
      highAlphaCount
    };
  }

  public stop(): void {
    this.isActive = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }
}

export const enhancedBirdeyeIntegration = new EnhancedBirdeyeIntegration();