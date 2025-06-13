/**
 * TEST MODE DEMO - Complete Trading Cycle Demonstration
 * Shows scan → buy → hold → sell cycle with realistic price simulation
 */

interface DemoTrade {
  id: string;
  tokenMint: string;
  symbol: string;
  entryPrice: number;
  entryAmount: number;
  tokensReceived: number;
  entryTime: number;
  currentPrice: number;
  status: 'ACTIVE' | 'SOLD_PROFIT' | 'SOLD_LOSS' | 'SOLD_STOP';
  entryTxHash: string;
  targetProfit: number;
  stopLoss: number;
  trailingStop: number;
  maxPriceReached: number;
  exitPrice?: number;
  exitTime?: number;
  profitLoss?: number;
  profitPercentage?: number;
  exitTxHash?: string;
}

class TestModeDemo {
  private activeTrades: Map<string, DemoTrade> = new Map();
  private tradeHistory: DemoTrade[] = [];
  private isRunning: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDemoTrade();
  }

  private initializeDemoTrade() {
    console.log('Initializing TEST MODE demo trade...');
    
    const demoTrade: DemoTrade = {
      id: `demo_${Date.now()}`,
      tokenMint: 'A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6',
      symbol: 'POPCAT',
      entryPrice: 0.75,
      entryAmount: 0.029,
      tokensReceived: 19.3157,
      entryTime: Date.now(),
      currentPrice: 0.75,
      status: 'ACTIVE',
      entryTxHash: this.generateTxHash(),
      targetProfit: 25,
      stopLoss: -20,
      trailingStop: -10,
      maxPriceReached: 0.75
    };

    this.activeTrades.set(demoTrade.id, demoTrade);
    console.log('Demo trade created:', demoTrade.symbol, 'at', demoTrade.entryPrice);
    
    this.startMonitoring();
  }

  private startMonitoring() {
    if (this.monitoringInterval) return;
    
    this.isRunning = true;
    this.monitoringInterval = setInterval(() => {
      this.updatePricesAndCheckExits();
    }, 5000); // Check every 5 seconds
    
    console.log('Started demo trade monitoring');
  }

  private updatePricesAndCheckExits() {
    for (const [id, trade] of this.activeTrades) {
      if (trade.status !== 'ACTIVE') continue;

      const newPrice = this.simulatePrice(trade);
      trade.currentPrice = newPrice;
      
      if (newPrice > trade.maxPriceReached) {
        trade.maxPriceReached = newPrice;
      }

      const exitCondition = this.checkExitConditions(trade);
      if (exitCondition.exit) {
        this.executeSell(trade, exitCondition.reason);
      } else {
        const priceChange = ((newPrice - trade.entryPrice) / trade.entryPrice) * 100;
        console.log(`Monitoring ${trade.symbol}: $${newPrice.toFixed(4)} (${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%)`);
      }
    }
  }

  private simulatePrice(trade: DemoTrade): number {
    const timeSinceEntry = Date.now() - trade.entryTime;
    const minutesElapsed = timeSinceEntry / (1000 * 60);
    
    let priceMultiplier = 1;
    
    if (minutesElapsed < 1) {
      // Initial pump - goes up 10-30%
      priceMultiplier = 1 + (0.1 + Math.random() * 0.2);
    } else if (minutesElapsed < 3) {
      // Continue trending up for profit demo
      priceMultiplier = 1 + (0.15 + Math.random() * 0.15);
    } else if (minutesElapsed < 5) {
      // Start declining to trigger trailing stop
      priceMultiplier = 1 + (0.05 - Math.random() * 0.2);
    } else {
      // Decline further to trigger stop loss
      priceMultiplier = 1 - (Math.random() * 0.3);
    }
    
    return trade.entryPrice * priceMultiplier;
  }

  private checkExitConditions(trade: DemoTrade): { exit: boolean; reason: string } {
    const currentChange = ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
    const maxChange = ((trade.maxPriceReached - trade.entryPrice) / trade.entryPrice) * 100;
    
    // Take profit condition
    if (currentChange >= trade.targetProfit) {
      return { exit: true, reason: 'TARGET_PROFIT' };
    }
    
    // Stop loss condition
    if (currentChange <= trade.stopLoss) {
      return { exit: true, reason: 'STOP_LOSS' };
    }
    
    // Trailing stop condition
    if (maxChange > 10 && (maxChange - currentChange) >= Math.abs(trade.trailingStop)) {
      return { exit: true, reason: 'TRAILING_STOP' };
    }
    
    return { exit: false, reason: '' };
  }

  private executeSell(trade: DemoTrade, reason: string) {
    trade.exitPrice = trade.currentPrice;
    trade.exitTime = Date.now();
    trade.exitTxHash = this.generateTxHash();
    
    const solReceived = trade.tokensReceived * trade.exitPrice;
    trade.profitLoss = solReceived - trade.entryAmount;
    trade.profitPercentage = ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
    
    if (reason === 'TARGET_PROFIT') {
      trade.status = 'SOLD_PROFIT';
    } else if (reason === 'STOP_LOSS') {
      trade.status = 'SOLD_LOSS';
    } else {
      trade.status = 'SOLD_STOP';
    }
    
    console.log(`TRADE COMPLETED: ${trade.symbol}`);
    console.log(`Entry: $${trade.entryPrice} | Exit: $${trade.exitPrice}`);
    console.log(`P&L: ${trade.profitLoss > 0 ? '+' : ''}${trade.profitLoss.toFixed(4)} SOL (${trade.profitPercentage > 0 ? '+' : ''}${trade.profitPercentage.toFixed(1)}%)`);
    console.log(`Reason: ${reason}`);
    
    this.activeTrades.delete(trade.id);
    this.tradeHistory.push(trade);
    
    // Create new demo trade after 10 seconds
    setTimeout(() => {
      this.initializeDemoTrade();
    }, 10000);
  }

  private generateTxHash(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  getActiveTrades(): DemoTrade[] {
    return Array.from(this.activeTrades.values());
  }

  getTradeHistory(): DemoTrade[] {
    return this.tradeHistory.slice(-10); // Return last 10 trades
  }

  getStats() {
    const totalTrades = this.tradeHistory.length;
    const profitableTrades = this.tradeHistory.filter(t => t.profitLoss && t.profitLoss > 0).length;
    const totalProfit = this.tradeHistory.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
    
    return {
      testMode: true,
      activeTrades: this.activeTrades.size,
      totalTrades,
      profitableTrades,
      totalProfit: totalProfit.toFixed(4),
      winRate: winRate.toFixed(1),
      isRunning: this.isRunning
    };
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    console.log('Test mode demo stopped');
  }
}

export const testModeDemo = new TestModeDemo();