import { adaptiveEngine } from './adaptive-trading-engine';
import type { TokenMetrics } from './adaptive-trading-engine';

interface AlphaToken {
  symbol: string;
  mintAddress: string;
  name?: string;
  price?: number;
  volume24h?: number;
  volumeChange24h?: number;
  marketCap?: number;
  liquidity?: number;
  holders?: number;
  priceChange1h?: number;
  priceChange24h?: number;
  priceChange7d?: number;
  confidence?: number;
  signals?: string[];
  source?: string;
}

interface TradingExecutionPlan {
  symbol: string;
  mintAddress: string;
  decision: any;
  executionTime: Date;
  executed: boolean;
  executionDetails?: {
    actualEntry: number;
    slippage: number;
    gasUsed: number;
    txHash?: string;
  };
}

class AdaptiveIntegrationService {
  private executionQueue: TradingExecutionPlan[] = [];
  private isProcessing: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startIntegrationService();
    console.log('🔗 Adaptive Integration Service started');
  }

  private startIntegrationService(): void {
    // Process execution queue every 30 seconds
    this.processInterval = setInterval(() => {
      this.processExecutionQueue();
    }, 30000);

    // Start periodic alpha token analysis every 2 minutes
    setInterval(() => {
      this.analyzeLatestAlphaTokens();
    }, 120000);
  }

  public async analyzeAlphaToken(alphaToken: AlphaToken): Promise<any> {
    try {
      // Convert alpha token to engine-compatible format
      const tokenMetrics = this.convertToTokenMetrics(alphaToken);
      
      // Analyze with adaptive engine
      const decision = await adaptiveEngine.analyzeToken(tokenMetrics);
      
      // If decision is to buy, add to execution queue
      if (decision.action === 'buy' && decision.confidenceScore >= 70) {
        await this.queueForExecution(alphaToken, decision);
      }

      console.log(`🧠 Analyzed ${alphaToken.symbol}: ${decision.action} (confidence: ${decision.confidenceScore}%)`);
      return decision;
    } catch (error) {
      console.error(`Error analyzing alpha token ${alphaToken.symbol}:`, error);
      return null;
    }
  }

  private convertToTokenMetrics(alphaToken: AlphaToken): TokenMetrics {
    // Calculate derived metrics with fallbacks
    const volatilityScore = this.calculateVolatilityScore(alphaToken);
    const liquidityScore = this.calculateLiquidityScore(alphaToken);
    const momentumScore = this.calculateMomentumScore(alphaToken);
    const riskScore = this.calculateRiskScore(alphaToken);
    const technicalScore = this.calculateTechnicalScore(alphaToken);
    const socialScore = this.calculateSocialScore(alphaToken);

    return {
      symbol: alphaToken.symbol,
      mintAddress: alphaToken.mintAddress,
      price: alphaToken.price || 0.001,
      volume24h: alphaToken.volume24h || 0,
      volumeChange24h: alphaToken.volumeChange24h || 0,
      marketCap: alphaToken.marketCap || 100000,
      liquidity: alphaToken.liquidity || 10000,
      holders: alphaToken.holders || 100,
      priceChange1h: alphaToken.priceChange1h || 0,
      priceChange24h: alphaToken.priceChange24h || 0,
      priceChange7d: alphaToken.priceChange7d || 0,
      volatilityScore,
      liquidityScore,
      momentumScore,
      riskScore,
      technicalScore,
      socialScore
    };
  }

  private calculateVolatilityScore(token: AlphaToken): number {
    const priceChanges = [
      Math.abs(token.priceChange1h || 0),
      Math.abs(token.priceChange24h || 0),
      Math.abs(token.priceChange7d || 0)
    ];
    
    const avgVolatility = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    return Math.min(100, avgVolatility * 2);
  }

  private calculateLiquidityScore(token: AlphaToken): number {
    if (!token.liquidity || !token.marketCap) return 30;
    
    const liquidityRatio = token.liquidity / token.marketCap;
    if (liquidityRatio > 0.3) return 90;
    if (liquidityRatio > 0.2) return 80;
    if (liquidityRatio > 0.1) return 70;
    if (liquidityRatio > 0.05) return 60;
    return 40;
  }

  private calculateMomentumScore(token: AlphaToken): number {
    const momentum = (token.priceChange1h || 0) * 0.5 + 
                    (token.priceChange24h || 0) * 0.3 + 
                    (token.volumeChange24h || 0) * 0.2;
    
    return Math.max(0, Math.min(100, momentum + 50));
  }

  private calculateRiskScore(token: AlphaToken): number {
    let riskScore = 50; // Base risk
    
    // Higher risk for very new tokens
    if (!token.holders || token.holders < 50) riskScore += 30;
    else if (token.holders < 200) riskScore += 20;
    else if (token.holders < 500) riskScore += 10;
    
    // Higher risk for low liquidity
    if (!token.liquidity || token.liquidity < 10000) riskScore += 25;
    else if (token.liquidity < 50000) riskScore += 15;
    
    // Higher risk for extreme volatility
    const volatility = Math.abs(token.priceChange24h || 0);
    if (volatility > 100) riskScore += 20;
    else if (volatility > 50) riskScore += 10;
    
    return Math.min(100, Math.max(0, riskScore));
  }

  private calculateTechnicalScore(token: AlphaToken): number {
    let score = 50;
    
    // Positive price action
    if ((token.priceChange1h || 0) > 0) score += 10;
    if ((token.priceChange24h || 0) > 0) score += 15;
    
    // Volume confirmation
    if ((token.volumeChange24h || 0) > 50) score += 20;
    else if ((token.volumeChange24h || 0) > 0) score += 10;
    
    // Market cap sweet spot
    if (token.marketCap && token.marketCap > 100000 && token.marketCap < 10000000) {
      score += 15;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateSocialScore(token: AlphaToken): number {
    let score = 50;
    
    // Boost for alpha scanner confidence
    if (token.confidence) {
      score += token.confidence * 0.3;
    }
    
    // Boost for multiple signals
    if (token.signals && token.signals.length > 0) {
      score += token.signals.length * 5;
    }
    
    // Boost for specific sources
    if (token.source === 'pump.fun') score += 10;
    if (token.source === 'dexscreener') score += 5;
    
    return Math.min(100, Math.max(0, score));
  }

  private async queueForExecution(token: AlphaToken, decision: any): Promise<void> {
    const executionPlan: TradingExecutionPlan = {
      symbol: token.symbol,
      mintAddress: token.mintAddress,
      decision,
      executionTime: new Date(Date.now() + 60000), // Execute in 1 minute
      executed: false
    };

    this.executionQueue.push(executionPlan);
    console.log(`📋 Queued ${token.symbol} for execution with ${decision.confidenceScore}% confidence`);
  }

  private async processExecutionQueue(): Promise<void> {
    if (this.isProcessing || this.executionQueue.length === 0) return;

    this.isProcessing = true;
    const now = new Date();

    try {
      for (const plan of this.executionQueue) {
        if (!plan.executed && plan.executionTime <= now) {
          await this.executeTradeDecision(plan);
        }
      }

      // Clean up executed trades older than 1 hour
      this.executionQueue = this.executionQueue.filter(
        plan => !plan.executed || (now.getTime() - plan.executionTime.getTime()) < 3600000
      );
    } catch (error) {
      console.error('Error processing execution queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeTradeDecision(plan: TradingExecutionPlan): Promise<void> {
    try {
      console.log(`🚀 Executing trade for ${plan.symbol} with ${plan.decision.confidenceScore}% confidence`);
      
      // Simulate trade execution (replace with actual trading logic)
      const executionDetails = {
        actualEntry: plan.decision.entryPrice * (1 + (Math.random() - 0.5) * 0.02), // 2% slippage simulation
        slippage: Math.random() * 0.02,
        gasUsed: Math.random() * 0.01,
        txHash: `sim_${Date.now()}_${plan.symbol}`
      };

      plan.executed = true;
      plan.executionDetails = executionDetails;

      // Record trade in system
      await this.recordExecutedTrade(plan);
      
      console.log(`✅ Executed ${plan.symbol}: Entry $${executionDetails.actualEntry.toFixed(6)}`);
    } catch (error) {
      console.error(`❌ Failed to execute trade for ${plan.symbol}:`, error);
    }
  }

  private async recordExecutedTrade(plan: TradingExecutionPlan): Promise<void> {
    // Record in adaptive engine for learning
    // Record in account intelligence
    // Update portfolio tracking
    console.log(`📊 Recorded trade execution for ${plan.symbol}`);
  }

  private async analyzeLatestAlphaTokens(): Promise<void> {
    try {
      // Get latest alpha tokens from existing scanners
      const response = await fetch('http://localhost:5000/api/alpha/tokens');
      if (!response.ok) return;

      const alphaTokens = await response.json();
      
      for (const token of alphaTokens.slice(0, 3)) { // Analyze top 3 tokens
        await this.analyzeAlphaToken(token);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      }
    } catch (error) {
      console.error('Error analyzing latest alpha tokens:', error);
    }
  }

  public getExecutionQueue(): TradingExecutionPlan[] {
    return this.executionQueue.slice(); // Return copy
  }

  public getQueueStatus() {
    return {
      totalQueued: this.executionQueue.length,
      pendingExecution: this.executionQueue.filter(p => !p.executed).length,
      executed: this.executionQueue.filter(p => p.executed).length,
      isProcessing: this.isProcessing
    };
  }

  public stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    console.log('🛑 Adaptive Integration Service stopped');
  }
}

export const adaptiveIntegrationService = new AdaptiveIntegrationService();
export { AdaptiveIntegrationService, type TradingExecutionPlan };