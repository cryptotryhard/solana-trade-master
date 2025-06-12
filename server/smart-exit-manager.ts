/**
 * SMART EXIT MANAGER
 * Advanced profit-taking and risk management for maximizing gains
 */

import { phantomLiveTrader } from './phantom-live-trader';
import { authenticWalletBalanceManager } from './authentic-wallet-balance-manager';

interface ExitCondition {
  symbol: string;
  mint: string;
  entryPrice: number;
  currentPrice: number;
  profitPercent: number;
  timeHeld: number; // minutes
  exitReason: 'take_profit' | 'trailing_stop' | 'time_exit' | 'momentum_loss';
}

interface SmartExitConfig {
  quickProfitThreshold: number;  // 15% for quick exits
  majorProfitThreshold: number;  // 100% for major gains
  trailingStopPercent: number;   // 8% trailing stop
  maxHoldTimeMinutes: number;    // 120 minutes max hold
  momentumExitThreshold: number; // -10% momentum loss
}

class SmartExitManager {
  private positions: Map<string, any> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private highWaterMarks: Map<string, number> = new Map();
  
  private config: SmartExitConfig = {
    quickProfitThreshold: 15,
    majorProfitThreshold: 100,
    trailingStopPercent: 8,
    maxHoldTimeMinutes: 120,
    momentumExitThreshold: -10
  };

  async monitorExitConditions(): Promise<ExitCondition[]> {
    const exitSignals: ExitCondition[] = [];
    
    for (const [symbol, position] of this.positions) {
      const currentPrice = await this.getCurrentPrice(position.mint);
      const entryPrice = position.entryPrice;
      const profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
      const timeHeld = (Date.now() - position.entryTime) / (1000 * 60);
      
      // Quick profit exit (15% gain)
      if (profitPercent >= this.config.quickProfitThreshold) {
        exitSignals.push({
          symbol,
          mint: position.mint,
          entryPrice,
          currentPrice,
          profitPercent,
          timeHeld,
          exitReason: 'take_profit'
        });
        continue;
      }
      
      // Trailing stop loss
      const highWaterMark = this.highWaterMarks.get(symbol) || currentPrice;
      if (currentPrice > highWaterMark) {
        this.highWaterMarks.set(symbol, currentPrice);
      }
      
      const drawdownPercent = ((highWaterMark - currentPrice) / highWaterMark) * 100;
      if (drawdownPercent >= this.config.trailingStopPercent) {
        exitSignals.push({
          symbol,
          mint: position.mint,
          entryPrice,
          currentPrice,
          profitPercent,
          timeHeld,
          exitReason: 'trailing_stop'
        });
        continue;
      }
      
      // Time-based exit
      if (timeHeld >= this.config.maxHoldTimeMinutes) {
        exitSignals.push({
          symbol,
          mint: position.mint,
          entryPrice,
          currentPrice,
          profitPercent,
          timeHeld,
          exitReason: 'time_exit'
        });
        continue;
      }
      
      // Momentum loss exit
      const momentum = this.calculateMomentum(symbol);
      if (momentum <= this.config.momentumExitThreshold) {
        exitSignals.push({
          symbol,
          mint: position.mint,
          entryPrice,
          currentPrice,
          profitPercent,
          timeHeld,
          exitReason: 'momentum_loss'
        });
      }
    }
    
    return exitSignals;
  }

  async executeSmartExit(exitCondition: ExitCondition): Promise<boolean> {
    try {
      console.log(`🎯 EXECUTING SMART EXIT: ${exitCondition.symbol}`);
      console.log(`💰 Profit: ${exitCondition.profitPercent.toFixed(2)}%`);
      console.log(`⚡ Reason: ${exitCondition.exitReason}`);
      
      // Get current token balance
      const tokenBalance = await this.getTokenBalance(exitCondition.mint);
      
      if (tokenBalance > 0) {
        // Execute sell order through Jupiter
        const sellResult = await phantomLiveTrader.executeRealJupiterSell(
          exitCondition.mint,
          tokenBalance,
          exitCondition.symbol
        );
        
        if (sellResult.success) {
          console.log(`✅ EXIT EXECUTED: ${exitCondition.symbol}`);
          console.log(`🔗 TX: ${sellResult.txHash}`);
          console.log(`💰 SOL received: ${sellResult.solReceived}`);
          
          // Remove from active positions
          this.positions.delete(exitCondition.symbol);
          this.priceHistory.delete(exitCondition.symbol);
          this.highWaterMarks.delete(exitCondition.symbol);
          
          // Update profit tracking
          await this.recordProfitRealization(exitCondition, sellResult.solReceived);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Exit execution failed for ${exitCondition.symbol}:`, error);
      return false;
    }
  }

  private async getCurrentPrice(mint: string): Promise<number> {
    try {
      // Get price from Jupiter API
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`);
      const data = await response.json();
      return data.data[mint]?.price || 0;
    } catch {
      return 0;
    }
  }

  private async getTokenBalance(mint: string): Promise<number> {
    try {
      const balance = await authenticWalletBalanceManager.getTokenBalance(mint);
      return balance;
    } catch {
      return 0;
    }
  }

  private calculateMomentum(symbol: string): number {
    const prices = this.priceHistory.get(symbol) || [];
    if (prices.length < 3) return 0;
    
    const recent = prices.slice(-3);
    const trend = (recent[2] - recent[0]) / recent[0] * 100;
    return trend;
  }

  private async recordProfitRealization(exit: ExitCondition, solReceived: number): Promise<void> {
    console.log(`📊 PROFIT REALIZED:`);
    console.log(`   Symbol: ${exit.symbol}`);
    console.log(`   Profit: ${exit.profitPercent.toFixed(2)}%`);
    console.log(`   SOL received: ${solReceived}`);
    console.log(`   Hold time: ${exit.timeHeld.toFixed(1)} minutes`);
  }

  public addPosition(symbol: string, position: any): void {
    this.positions.set(symbol, position);
    this.highWaterMarks.set(symbol, position.entryPrice);
  }

  public updatePriceHistory(symbol: string, price: number): void {
    const history = this.priceHistory.get(symbol) || [];
    history.push(price);
    
    // Keep only last 20 price points
    if (history.length > 20) {
      history.shift();
    }
    
    this.priceHistory.set(symbol, history);
  }

  public startExitMonitoring(): void {
    setInterval(async () => {
      const exitSignals = await this.monitorExitConditions();
      
      for (const signal of exitSignals) {
        await this.executeSmartExit(signal);
      }
    }, 15000); // Check every 15 seconds
  }

  public getActivePositions(): any[] {
    return Array.from(this.positions.values());
  }
}

export const smartExitManager = new SmartExitManager();