import { livePortfolioTracker } from './live-portfolio-tracker';
import { tradeLogger } from './trade-logger';

interface ReinvestmentConfig {
  minProfitThreshold: number; // Minimum profit in USD to trigger reinvestment
  profitReinvestPercent: number; // Percentage of profits to reinvest (0-100)
  maxReinvestAmount: number; // Maximum USD amount to reinvest at once
  cooldownMinutes: number; // Minutes to wait between reinvestments
  winRateThreshold: number; // Minimum win rate (0-100) to enable aggressive reinvestment
}

interface ReinvestmentOpportunity {
  symbol: string;
  mintAddress: string;
  recommendedAmount: number;
  confidence: number;
  reason: string;
  profitSource: string;
  estimatedROI: number;
}

class DynamicReinvestmentEngine {
  private config: ReinvestmentConfig = {
    minProfitThreshold: 15, // $15 minimum profit - ultra aggressive
    profitReinvestPercent: 75, // Reinvest 75% of profits - maximum compounding
    maxReinvestAmount: 1000, // Max $1000 per reinvestment - scaled for growth
    cooldownMinutes: 5, // 5 minute cooldown - maximum velocity
    winRateThreshold: 45 // 45% win rate for aggressive mode - risk tolerance
  };

  private lastReinvestment: Date | null = null;

  calculateReinvestmentAmount(): number {
    const portfolio = livePortfolioTracker.getLastSnapshot();
    if (!portfolio) return 0;

    // Get profitable positions
    const profitableHoldings = portfolio.holdings.filter(h => h.pnlUSD > 0);
    const totalProfits = profitableHoldings.reduce((sum, h) => sum + h.pnlUSD, 0);

    if (totalProfits < this.config.minProfitThreshold) {
      return 0;
    }

    // Check cooldown
    if (this.lastReinvestment) {
      const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
      const timeSinceLastReinvestment = Date.now() - this.lastReinvestment.getTime();
      if (timeSinceLastReinvestment < cooldownMs) {
        return 0;
      }
    }

    // Calculate reinvestment amount
    const baseReinvestment = totalProfits * (this.config.profitReinvestPercent / 100);
    
    // Adjust based on performance
    const tradeSummary = tradeLogger.getTradeSummary();
    let multiplier = 1;

    if (tradeSummary.winRate >= this.config.winRateThreshold) {
      multiplier = 1.5; // Aggressive mode - 50% more
      console.log(`🚀 Aggressive reinvestment mode: ${tradeSummary.winRate.toFixed(1)}% win rate`);
    } else if (tradeSummary.winRate < 40) {
      multiplier = 0.6; // Conservative mode - 40% less
      console.log(`⚠️ Conservative reinvestment mode: ${tradeSummary.winRate.toFixed(1)}% win rate`);
    }

    const finalAmount = Math.min(
      baseReinvestment * multiplier,
      this.config.maxReinvestAmount
    );

    return Math.max(0, finalAmount);
  }

  async findReinvestmentOpportunity(): Promise<ReinvestmentOpportunity | null> {
    try {
      // Get current alpha opportunities
      const response = await fetch('http://localhost:5000/api/alpha/tokens');
      if (!response.ok) return null;

      const alphaTokens = await response.json();
      if (!alphaTokens || alphaTokens.length === 0) return null;

      // Find highest confidence opportunity
      const bestOpportunity = alphaTokens.reduce((best: any, current: any) => 
        (current.confidence || 0) > (best?.confidence || 0) ? current : best, null);

      if (!bestOpportunity || bestOpportunity.confidence < 70) {
        return null;
      }

      const reinvestAmount = this.calculateReinvestmentAmount();
      if (reinvestAmount === 0) return null;

      // Get the best performing strategy for ROI estimation
      const tradeSummary = tradeLogger.getTradeSummary();
      const estimatedROI = tradeSummary.bestTrade ? 
        Math.abs(tradeSummary.bestTrade.pnlPercent || 15) : 15;

      return {
        symbol: bestOpportunity.symbol,
        mintAddress: bestOpportunity.mintAddress,
        recommendedAmount: reinvestAmount,
        confidence: bestOpportunity.confidence,
        reason: `Reinvesting profits from winners into high-confidence opportunity`,
        profitSource: 'portfolio_profits',
        estimatedROI
      };
    } catch (error) {
      console.error('Error finding reinvestment opportunity:', error);
      return null;
    }
  }

  async executeReinvestment(opportunity: ReinvestmentOpportunity): Promise<boolean> {
    try {
      console.log(`💰 Executing reinvestment: $${opportunity.recommendedAmount.toFixed(2)} → ${opportunity.symbol}`);
      
      // Calculate SOL amount from USD amount
      const solPrice = 240; // Approximate SOL price
      const solAmount = opportunity.recommendedAmount / solPrice;

      // Execute the trade via Jupiter
      const response = await fetch('http://localhost:5000/api/trading/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy',
          symbol: opportunity.symbol,
          mintAddress: opportunity.mintAddress,
          amount: solAmount,
          source: 'reinvestment'
        })
      });

      if (response.ok) {
        this.lastReinvestment = new Date();
        console.log(`✅ Reinvestment executed successfully: ${opportunity.symbol}`);
        return true;
      } else {
        console.log(`❌ Reinvestment failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('Error executing reinvestment:', error);
      return false;
    }
  }

  async checkAndExecuteReinvestment(): Promise<ReinvestmentOpportunity | null> {
    const opportunity = await this.findReinvestmentOpportunity();
    
    if (opportunity) {
      const success = await this.executeReinvestment(opportunity);
      if (success) {
        return opportunity;
      }
    }
    
    return null;
  }

  getConfig(): ReinvestmentConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<ReinvestmentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`📊 Reinvestment config updated:`, newConfig);
  }

  getStatus(): {
    enabled: boolean;
    availableAmount: number;
    lastReinvestment: Date | null;
    nextEligible: Date | null;
    winRate: number;
    mode: 'aggressive' | 'normal' | 'conservative';
  } {
    const tradeSummary = tradeLogger.getTradeSummary();
    const availableAmount = this.calculateReinvestmentAmount();
    
    let nextEligible: Date | null = null;
    if (this.lastReinvestment) {
      nextEligible = new Date(this.lastReinvestment.getTime() + this.config.cooldownMinutes * 60 * 1000);
    }

    let mode: 'aggressive' | 'normal' | 'conservative' = 'normal';
    if (tradeSummary.winRate >= this.config.winRateThreshold) {
      mode = 'aggressive';
    } else if (tradeSummary.winRate < 40) {
      mode = 'conservative';
    }

    return {
      enabled: availableAmount > 0,
      availableAmount,
      lastReinvestment: this.lastReinvestment,
      nextEligible,
      winRate: tradeSummary.winRate,
      mode
    };
  }

  // Start automatic reinvestment monitoring
  startAutomaticReinvestment(): void {
    setInterval(async () => {
      try {
        const opportunity = await this.checkAndExecuteReinvestment();
        if (opportunity) {
          console.log(`🔄 Auto-reinvestment triggered: ${opportunity.symbol} ($${opportunity.recommendedAmount.toFixed(2)})`);
        }
      } catch (error) {
        console.error('Auto-reinvestment check failed:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
}

export const dynamicReinvestmentEngine = new DynamicReinvestmentEngine();

// Start automatic reinvestment immediately
dynamicReinvestmentEngine.startAutomaticReinvestment();
export { ReinvestmentOpportunity, ReinvestmentConfig };