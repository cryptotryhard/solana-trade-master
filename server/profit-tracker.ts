import { storage } from './storage';
import { liveDataService } from './live-data-service';
import type { Trade, Portfolio } from '@shared/schema';

interface Position {
  symbol: string;
  mintAddress: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  entryTime: Date;
  unrealizedPnL: number;
  realizedPnL: number;
  roi: number;
}

interface PortfolioMetrics {
  totalValue: number;
  dailyPnL: number;
  totalPnL: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  positions: Position[];
  tradingStats: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgWinAmount: number;
    avgLossAmount: number;
    largestWin: number;
    largestLoss: number;
  };
}

class ProfitTracker {
  private positions = new Map<string, Position>();
  private dailyStartBalance = 0;
  private initialBalance = 300; // Starting capital
  
  constructor() {
    this.initializeTracker();
  }

  private async initializeTracker() {
    const portfolio = await storage.getPortfolio(1);
    if (portfolio) {
      this.dailyStartBalance = parseFloat(portfolio.totalBalance);
    } else {
      this.dailyStartBalance = this.initialBalance;
    }
  }

  async updatePositions(): Promise<void> {
    try {
      const trades = await storage.getTrades(1);
      const currentPrices = await this.getCurrentPrices();
      
      // Rebuild positions from trade history
      this.positions.clear();
      const positionMap = new Map<string, { quantity: number, totalCost: number, trades: Trade[] }>();
      
      for (const trade of trades) {
        const key = trade.symbol;
        if (!positionMap.has(key)) {
          positionMap.set(key, { quantity: 0, totalCost: 0, trades: [] });
        }
        
        const position = positionMap.get(key)!;
        const quantity = parseFloat(trade.amount);
        const price = parseFloat(trade.price);
        
        if (trade.side === 'buy') {
          position.quantity += quantity;
          position.totalCost += quantity * price;
        } else {
          position.quantity -= quantity;
          position.totalCost -= quantity * price;
        }
        
        position.trades.push(trade);
      }
      
      // Create position objects
      for (const [symbol, posData] of positionMap.entries()) {
        if (posData.quantity > 0) {
          const avgEntryPrice = posData.totalCost / posData.quantity;
          const currentPrice = currentPrices.get(symbol) || avgEntryPrice;
          const unrealizedPnL = (currentPrice - avgEntryPrice) * posData.quantity;
          const roi = ((currentPrice - avgEntryPrice) / avgEntryPrice) * 100;
          
          const position: Position = {
            symbol,
            mintAddress: this.getMintAddress(symbol),
            side: 'long',
            entryPrice: avgEntryPrice,
            currentPrice,
            quantity: posData.quantity,
            entryTime: posData.trades[0].timestamp || new Date(),
            unrealizedPnL,
            realizedPnL: this.calculateRealizedPnL(posData.trades),
            roi
          };
          
          this.positions.set(symbol, position);
        }
      }
    } catch (error) {
      console.error('Failed to update positions:', error);
    }
  }

  private async getCurrentPrices(): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    try {
      const tokens = await liveDataService.getTopMemecoins();
      for (const token of tokens) {
        prices.set(token.symbol, token.price);
      }
    } catch (error) {
      console.error('Failed to fetch current prices:', error);
    }
    return prices;
  }

  private getMintAddress(symbol: string): string {
    const mintMap: { [key: string]: string } = {
      'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      'WIF': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
      'POPCAT': '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
      'PEPE': '6GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr'
    };
    return mintMap[symbol] || '';
  }

  private calculateRealizedPnL(trades: Trade[]): number {
    return trades.reduce((total, trade) => {
      const pnl = parseFloat(trade.pnl || '0');
      return total + pnl;
    }, 0);
  }

  async calculatePortfolioMetrics(): Promise<PortfolioMetrics> {
    await this.updatePositions();
    
    const trades = await storage.getTrades(1);
    const positions = Array.from(this.positions.values());
    
    // Calculate total portfolio value
    const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    const totalRealizedPnL = trades.reduce((sum, trade) => sum + parseFloat(trade.pnl || '0'), 0);
    const totalValue = this.initialBalance + totalRealizedPnL + totalUnrealizedPnL;
    
    // Calculate daily P&L
    const dailyPnL = totalValue - this.dailyStartBalance;
    
    // Calculate trading statistics
    const winningTrades = trades.filter(t => parseFloat(t.pnl || '0') > 0);
    const losingTrades = trades.filter(t => parseFloat(t.pnl || '0') < 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    
    const avgWinAmount = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / winningTrades.length 
      : 0;
    
    const avgLossAmount = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / losingTrades.length)
      : 0;
    
    const profitFactor = avgLossAmount > 0 ? avgWinAmount / avgLossAmount : 0;
    
    const pnlValues = trades.map(t => parseFloat(t.pnl || '0'));
    const largestWin = Math.max(...pnlValues, 0);
    const largestLoss = Math.min(...pnlValues, 0);
    
    // Calculate max drawdown (simplified)
    const maxDrawdown = this.calculateMaxDrawdown(trades);
    
    // Calculate Sharpe ratio (simplified)
    const returns = this.calculateReturns(trades);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    
    return {
      totalValue,
      dailyPnL,
      totalPnL: totalRealizedPnL + totalUnrealizedPnL,
      winRate,
      profitFactor,
      maxDrawdown,
      sharpeRatio,
      positions,
      tradingStats: {
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        avgWinAmount,
        avgLossAmount,
        largestWin,
        largestLoss
      }
    };
  }

  private calculateMaxDrawdown(trades: Trade[]): number {
    let peak = this.initialBalance;
    let maxDrawdown = 0;
    let runningBalance = this.initialBalance;
    
    for (const trade of trades) {
      runningBalance += parseFloat(trade.pnl || '0');
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      const drawdown = ((peak - runningBalance) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  private calculateReturns(trades: Trade[]): number[] {
    const returns: number[] = [];
    let previousBalance = this.initialBalance;
    
    for (const trade of trades) {
      const currentBalance = previousBalance + parseFloat(trade.pnl || '0');
      const returnPercent = ((currentBalance - previousBalance) / previousBalance) * 100;
      returns.push(returnPercent);
      previousBalance = currentBalance;
    }
    
    return returns;
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Assuming risk-free rate of 2% annually, adjusted for trading frequency
    const riskFreeRate = 0.02 / 365; // Daily risk-free rate
    
    return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
  }

  async updatePortfolioInDatabase(): Promise<void> {
    try {
      const metrics = await this.calculatePortfolioMetrics();
      
      await storage.updatePortfolio(1, {
        totalBalance: metrics.totalValue.toFixed(2),
        dailyPnl: metrics.dailyPnL.toFixed(2),
        activePositions: metrics.positions.length,
        winRate: metrics.winRate.toFixed(1),
        totalTrades: metrics.tradingStats.totalTrades
      });
      
      console.log(`💰 Portfolio Updated: $${metrics.totalValue.toFixed(2)} | Daily P&L: ${metrics.dailyPnL >= 0 ? '+' : ''}$${metrics.dailyPnL.toFixed(2)} | Win Rate: ${metrics.winRate.toFixed(1)}%`);
    } catch (error) {
      console.error('Failed to update portfolio:', error);
    }
  }

  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  async getDetailedPortfolioReport(): Promise<PortfolioMetrics> {
    return await this.calculatePortfolioMetrics();
  }

  // Calculate position size based on risk management
  calculateOptimalPositionSize(
    accountBalance: number, 
    riskPercent: number, 
    entryPrice: number, 
    stopLossPrice: number
  ): number {
    const riskAmount = accountBalance * (riskPercent / 100);
    const priceRisk = Math.abs(entryPrice - stopLossPrice);
    return riskAmount / priceRisk;
  }

  // Kelly Criterion for position sizing
  calculateKellyPositionSize(winRate: number, avgWin: number, avgLoss: number): number {
    if (avgLoss === 0) return 0;
    const kellyPercent = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    return Math.max(0, Math.min(0.25, kellyPercent)); // Cap at 25% for safety
  }
}

export const profitTracker = new ProfitTracker();