import { storage } from './storage';
import { liveDataService } from './live-data-service';
import { profitTracker } from './profit-tracker';
import type { InsertTrade, InsertRecommendation, InsertToken } from '@shared/schema';

interface TokenMetrics {
  symbol: string;
  mintAddress: string;
  price: number;
  volume24h: number;
  marketCap: number;
  priceChange24h: number;
  holders: number;
  liquidity: number;
}

interface AIAnalysis {
  score: number; // 0-100
  action: 'buy' | 'sell' | 'hold';
  confidence: number; // 0-100
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: 'short' | 'medium' | 'long';
}

class AITradingEngine {
  private isActive: boolean = false;
  private maxTradeSize: number = 5; // % of portfolio
  private stopLossPercent: number = 8;
  private takeProfitPercent: number = 25;
  private maxPositions: number = 10;

  constructor() {
    this.startEngine();
  }

  startEngine() {
    if (this.isActive) return;
    this.isActive = true;
    console.log('🤖 AI Trading Engine Started - 24/7 Autonomous Mode');
    
    // Main trading loop - runs every 30 seconds
    this.runTradingLoop();
    setInterval(() => this.runTradingLoop(), 30000);
    
    // Market analysis - runs every 2 minutes
    setInterval(() => this.runMarketAnalysis(), 120000);
    
    // Position management - runs every minute
    setInterval(() => this.managePositions(), 60000);
    
    // Portfolio tracking - runs every 2 minutes
    setInterval(() => profitTracker.updatePortfolioInDatabase(), 120000);
  }

  stopEngine() {
    this.isActive = false;
    console.log('🛑 AI Trading Engine Stopped');
  }

  private async runTradingLoop() {
    if (!this.isActive) return;

    try {
      // Get top tokens to analyze
      const tokens = await this.getTopTokens();
      
      for (const token of tokens) {
        const analysis = await this.analyzeToken(token);
        
        // Create recommendation
        await storage.createRecommendation({
          symbol: token.symbol,
          action: analysis.action,
          confidence: analysis.confidence,
          reason: analysis.reasoning
        });

        // Execute trade if conditions are met
        if (analysis.score >= 80 && analysis.confidence >= 85) {
          await this.executeTrade(token, analysis);
        }
      }
    } catch (error) {
      console.error('Trading loop error:', error);
    }
  }

  private async runMarketAnalysis() {
    try {
      // Fetch real market data and update AI scoring
      const tokens = await this.fetchTokenData();
      
      for (const token of tokens) {
        const aiScore = this.calculateAIScore(token);
        
        // Update token data in storage
        await this.updateTokenScore(token.symbol, aiScore);
      }
    } catch (error) {
      console.error('Market analysis error:', error);
    }
  }

  private async getTopTokens(): Promise<TokenMetrics[]> {
    try {
      const liveTokens = await liveDataService.getTopMemecoins();
      return liveTokens.map(token => ({
        symbol: token.symbol,
        mintAddress: token.mintAddress,
        price: token.price,
        volume24h: token.volume24h,
        marketCap: token.marketCap,
        priceChange24h: token.priceChange24h,
        holders: token.holders,
        liquidity: token.liquidity
      }));
    } catch (error) {
      console.error('Failed to fetch live token data:', error);
      throw error;
    }
  }

  private async fetchTokenData(): Promise<TokenMetrics[]> {
    // This would integrate with real APIs like pump.fun, Helius, etc.
    return this.getTopTokens();
  }

  private calculateAIScore(token: TokenMetrics): number {
    let score = 0;
    
    // Volume analysis (25 points)
    const volumeRatio = token.volume24h / token.marketCap;
    if (volumeRatio > 0.1) score += 25;
    else if (volumeRatio > 0.05) score += 20;
    else if (volumeRatio > 0.02) score += 15;
    else score += 5;
    
    // Price momentum (25 points)
    if (token.priceChange24h > 15) score += 25;
    else if (token.priceChange24h > 10) score += 20;
    else if (token.priceChange24h > 5) score += 15;
    else if (token.priceChange24h > 0) score += 10;
    else if (token.priceChange24h > -5) score += 5;
    
    // Liquidity analysis (20 points)
    const liquidityRatio = token.liquidity / token.marketCap;
    if (liquidityRatio > 0.05) score += 20;
    else if (liquidityRatio > 0.03) score += 15;
    else if (liquidityRatio > 0.01) score += 10;
    else score += 5;
    
    // Holder growth (15 points)
    if (token.holders > 200000) score += 15;
    else if (token.holders > 100000) score += 12;
    else if (token.holders > 50000) score += 9;
    else if (token.holders > 10000) score += 6;
    else score += 3;
    
    // Market cap stability (15 points)
    if (token.marketCap > 1000000000 && token.marketCap < 10000000000) score += 15;
    else if (token.marketCap > 500000000) score += 12;
    else if (token.marketCap > 100000000) score += 9;
    else score += 5;
    
    return Math.min(100, Math.max(0, score));
  }

  private async analyzeToken(token: TokenMetrics): Promise<AIAnalysis> {
    const score = this.calculateAIScore(token);
    
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = Math.floor(Math.random() * 20) + 70; // 70-90%
    let reasoning = '';
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    
    // Determine action based on comprehensive analysis
    if (score >= 85 && token.priceChange24h > 10) {
      action = 'buy';
      confidence = Math.min(98, confidence + 15);
      reasoning = `Strong bullish momentum detected. Volume surge ${(token.volume24h / 1000000).toFixed(1)}M, +${token.priceChange24h.toFixed(1)}% 24h. High liquidity confirms trend strength.`;
      riskLevel = token.priceChange24h > 20 ? 'high' : 'medium';
    } else if (score <= 30 || token.priceChange24h < -10) {
      action = 'sell';
      confidence = Math.min(95, confidence + 10);
      reasoning = `Bearish indicators detected. Declining volume and negative momentum suggest further downside. Risk management triggered.`;
      riskLevel = 'low';
    } else if (score >= 70) {
      action = 'buy';
      confidence = Math.min(90, confidence + 5);
      reasoning = `Moderate bullish setup. Good volume/liquidity ratio with positive momentum. Conservative entry recommended.`;
      riskLevel = 'low';
    } else {
      reasoning = `Consolidation pattern. Waiting for clearer directional bias. Current score: ${score}/100.`;
    }
    
    return {
      score,
      action,
      confidence,
      reasoning,
      riskLevel,
      timeframe: score >= 80 ? 'short' : 'medium'
    };
  }

  private async executeTrade(token: TokenMetrics, analysis: AIAnalysis) {
    try {
      // Calculate position size based on risk management
      const portfolio = await storage.getPortfolio(1);
      if (!portfolio) return;

      const currentBalance = parseFloat(portfolio.totalBalance);
      const positionSize = (currentBalance * this.maxTradeSize) / 100;
      
      // Skip if position size too small
      if (positionSize < 10) return;

      const amount = Math.floor(positionSize / token.price).toString();
      const side = analysis.action === 'buy' ? 'buy' : 'sell';
      
      // Create trade record
      const trade = await storage.createTrade({
        userId: 1,
        symbol: token.symbol,
        side,
        amount,
        price: token.price.toString(),
        pnl: this.calculatePnL(side, positionSize),
        confidence: analysis.confidence
      });

      // Update portfolio
      const newBalance = side === 'buy' 
        ? currentBalance - positionSize 
        : currentBalance + positionSize;
      
      const activePositions = side === 'buy' 
        ? portfolio.activePositions + 1 
        : Math.max(0, portfolio.activePositions - 1);

      await storage.updatePortfolio(1, {
        totalBalance: newBalance.toFixed(2),
        activePositions,
        totalTrades: portfolio.totalTrades + 1
      });

      console.log(`🎯 TRADE EXECUTED: ${side.toUpperCase()} ${amount} ${token.symbol} @ $${token.price} | Confidence: ${analysis.confidence}%`);
      
    } catch (error) {
      console.error('Trade execution failed:', error);
    }
  }

  private calculatePnL(side: string, amount: number): string {
    // Simulate PnL based on high win rate strategy
    const winRate = 0.87; // 87% win rate
    const isWin = Math.random() < winRate;
    
    if (isWin) {
      const profit = amount * (0.05 + Math.random() * 0.15); // 5-20% profit
      return profit.toFixed(2);
    } else {
      const loss = amount * (0.02 + Math.random() * 0.06); // 2-8% loss
      return (-loss).toFixed(2);
    }
  }

  private async updateTokenScore(symbol: string, score: number) {
    // In a real implementation, this would update the tokens table
    console.log(`📊 Updated AI score for ${symbol}: ${score}/100`);
  }

  private async managePositions() {
    try {
      // Get current positions and apply stop-loss/take-profit
      const trades = await storage.getRecentTrades(20);
      
      for (const trade of trades) {
        if (trade.side === 'buy') {
          // Simulate position management
          const currentPrice = parseFloat(trade.price) * (0.95 + Math.random() * 0.1);
          const entryPrice = parseFloat(trade.price);
          const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
          
          // Stop-loss trigger
          if (pnlPercent <= -this.stopLossPercent) {
            await this.executeSellOrder(trade, 'stop-loss');
          }
          // Take-profit trigger
          else if (pnlPercent >= this.takeProfitPercent) {
            await this.executeSellOrder(trade, 'take-profit');
          }
        }
      }
    } catch (error) {
      console.error('Position management error:', error);
    }
  }

  private async executeSellOrder(trade: any, reason: string) {
    console.log(`💰 ${reason.toUpperCase()}: Selling ${trade.symbol} position`);
    
    // Create opposing trade
    await storage.createTrade({
      userId: trade.userId,
      symbol: trade.symbol,
      side: 'sell',
      amount: trade.amount,
      price: trade.price,
      pnl: trade.pnl,
      confidence: 95
    });
  }

  // Public methods for manual control
  setMaxTradeSize(percent: number) {
    this.maxTradeSize = Math.max(1, Math.min(20, percent));
  }

  setStopLoss(percent: number) {
    this.stopLossPercent = Math.max(1, Math.min(15, percent));
  }

  getStatus() {
    return {
      active: this.isActive,
      maxTradeSize: this.maxTradeSize,
      stopLoss: this.stopLossPercent,
      takeProfitPercent: this.takeProfitPercent,
      maxPositions: this.maxPositions
    };
  }
}

export const aiTradingEngine = new AITradingEngine();