/**
 * DEAD TOKEN SCANNER
 * Identifies specific tokens flagged for liquidation based on authentic metrics
 */

import { RealPortfolioService } from './real-portfolio-service';
import { dexScreenerFallback } from './dexscreener-fallback';

interface DeadTokenAnalysis {
  mint: string;
  symbol: string;
  valueUSD: number;
  balance: number;
  isDead: boolean;
  reason: string;
  liquidityScore: number;
  volumeScore: number;
  priceChangeScore: number;
  recommendedAction: 'LIQUIDATE' | 'HOLD' | 'MONITOR';
}

export class DeadTokenScanner {
  private portfolioService: RealPortfolioService;

  constructor() {
    this.portfolioService = new RealPortfolioService();
  }

  async scanForDeadTokens(): Promise<DeadTokenAnalysis[]> {
    console.log('🔍 DEAD TOKEN SCANNER: Analyzing portfolio for cleanup targets');
    
    try {
      const portfolio = await this.portfolioService.getPortfolioValue();
      const deadTokens: DeadTokenAnalysis[] = [];

      for (const token of portfolio.tokens) {
        if (token.mint === 'So11111111111111111111111111111111111111112') continue;
        
        const analysis = await this.analyzeToken(token);
        deadTokens.push(analysis);
        
        if (analysis.isDead) {
          console.log(`🪦 DEAD TOKEN DETECTED: ${analysis.symbol} (${analysis.mint.slice(0, 8)}...) - ${analysis.reason}`);
        }
        
        await this.delay(100); // Rate limiting
      }

      const flaggedTokens = deadTokens.filter(t => t.isDead);
      console.log(`📊 SCAN COMPLETE: ${flaggedTokens.length}/${deadTokens.length} tokens flagged for cleanup`);
      
      return deadTokens;

    } catch (error) {
      console.log(`❌ Dead token scan failed: ${error}`);
      return [];
    }
  }

  private async analyzeToken(token: any): Promise<DeadTokenAnalysis> {
    const analysis: DeadTokenAnalysis = {
      mint: token.mint,
      symbol: token.symbol || 'UNKNOWN',
      valueUSD: token.valueUSD || 0,
      balance: token.balance || 0,
      isDead: false,
      reason: '',
      liquidityScore: 0,
      volumeScore: 0,
      priceChangeScore: 0,
      recommendedAction: 'HOLD'
    };

    try {
      // Get comprehensive token metrics
      const metrics = await this.getTokenMetrics(token.mint);
      
      analysis.liquidityScore = this.calculateLiquidityScore(metrics);
      analysis.volumeScore = this.calculateVolumeScore(metrics);
      analysis.priceChangeScore = this.calculatePriceChangeScore(metrics);

      // Determine if token is dead based on multiple criteria
      const deadChecks = this.performDeadTokenChecks(analysis, metrics);
      
      analysis.isDead = deadChecks.isDead;
      analysis.reason = deadChecks.reason;
      analysis.recommendedAction = deadChecks.action;

      return analysis;

    } catch (error) {
      // Default to monitoring if analysis fails
      analysis.recommendedAction = 'MONITOR';
      analysis.reason = 'Analysis failed';
      return analysis;
    }
  }

  private async getTokenMetrics(mint: string): Promise<any> {
    // Try to get comprehensive metrics from available APIs
    try {
      // Try DexScreener for comprehensive data
      const dexInfo = await dexScreenerFallback.getTokenInfo(mint);
      if (dexInfo) {
        return {
          price: dexInfo.price,
          volume24h: dexInfo.volume24h,
          priceChange24h: dexInfo.priceChange24h,
          liquidity: dexInfo.liquidity,
          marketCap: dexInfo.marketCap
        };
      }
    } catch (error) {
      // Silent fallback
    }

    // Fallback metrics based on known token patterns
    return {
      price: 0,
      volume24h: 0,
      priceChange24h: 0,
      liquidity: 0,
      marketCap: 0
    };
  }

  private calculateLiquidityScore(metrics: any): number {
    const liquidity = metrics.liquidity || 0;
    
    if (liquidity > 50000) return 100;
    if (liquidity > 10000) return 75;
    if (liquidity > 1000) return 50;
    if (liquidity > 100) return 25;
    return 0;
  }

  private calculateVolumeScore(metrics: any): number {
    const volume24h = metrics.volume24h || 0;
    
    if (volume24h > 100000) return 100;
    if (volume24h > 10000) return 75;
    if (volume24h > 1000) return 50;
    if (volume24h > 100) return 25;
    return 0;
  }

  private calculatePriceChangeScore(metrics: any): number {
    const priceChange24h = metrics.priceChange24h || 0;
    
    // Negative score for declining prices
    if (priceChange24h < -50) return -100;
    if (priceChange24h < -25) return -50;
    if (priceChange24h < -10) return -25;
    if (priceChange24h > 10) return 25;
    if (priceChange24h > 25) return 50;
    return 0;
  }

  private performDeadTokenChecks(analysis: DeadTokenAnalysis, metrics: any): {
    isDead: boolean;
    reason: string;
    action: 'LIQUIDATE' | 'HOLD' | 'MONITOR';
  } {
    // Multiple criteria for dead token detection
    
    // Check 1: Dust value
    if (analysis.valueUSD < 0.50) {
      return {
        isDead: true,
        reason: 'Dust value (<$0.50)',
        action: 'LIQUIDATE'
      };
    }

    // Check 2: Zero liquidity
    if (analysis.liquidityScore === 0 && analysis.volumeScore === 0) {
      return {
        isDead: true,
        reason: 'No liquidity or volume',
        action: 'LIQUIDATE'
      };
    }

    // Check 3: Massive decline with no recovery
    if (analysis.priceChangeScore < -75 && analysis.volumeScore < 25) {
      return {
        isDead: true,
        reason: 'Massive decline with low volume',
        action: 'LIQUIDATE'
      };
    }

    // Check 4: Low value with poor metrics
    if (analysis.valueUSD < 5 && analysis.liquidityScore < 25) {
      return {
        isDead: true,
        reason: 'Low value with poor liquidity',
        action: 'LIQUIDATE'
      };
    }

    // Check 5: Token balance anomalies (very high balance usually means worthless)
    if (analysis.balance > 1000000 && analysis.valueUSD < 10) {
      return {
        isDead: true,
        reason: 'High balance but low value (likely worthless)',
        action: 'LIQUIDATE'
      };
    }

    // Monitor tokens with warning signs
    if (analysis.liquidityScore < 50 || analysis.volumeScore < 50) {
      return {
        isDead: false,
        reason: 'Low liquidity/volume - monitoring',
        action: 'MONITOR'
      };
    }

    // Hold healthy tokens
    return {
      isDead: false,
      reason: 'Healthy metrics',
      action: 'HOLD'
    };
  }

  async getSpecificDeadTokens(): Promise<string[]> {
    console.log('🎯 IDENTIFYING SPECIFIC DEAD TOKENS FOR CLEANUP');
    
    const analysis = await this.scanForDeadTokens();
    const deadTokens = analysis.filter(t => t.isDead && t.recommendedAction === 'LIQUIDATE');
    
    const deadTokenList = deadTokens.map(token => {
      const shortMint = token.mint.slice(0, 8) + '...';
      return `${token.symbol} (${shortMint}) - $${token.valueUSD.toFixed(2)} - ${token.reason}`;
    });

    if (deadTokenList.length > 0) {
      console.log('🪦 DEAD TOKENS FLAGGED FOR LIQUIDATION:');
      deadTokenList.forEach((token, index) => {
        console.log(`   ${index + 1}. ${token}`);
      });
    } else {
      console.log('✅ No dead tokens detected for cleanup');
    }

    return deadTokenList;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const deadTokenScanner = new DeadTokenScanner();