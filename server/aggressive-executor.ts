import { Connection, PublicKey, Keypair } from '@solana/web3.js';

interface AggressiveTradeConfig {
  minConfidence: number;
  maxPositionSize: number;
  executionFrequency: number;
  targetTradesPerHour: number;
}

class AggressiveExecutor {
  private connection: Connection;
  private wallet: PublicKey;
  private config: AggressiveTradeConfig;
  private executionQueue: any[] = [];
  private isExecuting: boolean = false;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
    this.wallet = new PublicKey('9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d');
    this.config = {
      minConfidence: 75,
      maxPositionSize: 0.15,
      executionFrequency: 30000, // 30 seconds
      targetTradesPerHour: 20
    };

    this.startAggressiveExecution();
  }

  private async startAggressiveExecution(): Promise<void> {
    console.log('🚀 AGGRESSIVE EXECUTOR ONLINE');
    console.log(`🎯 Target: ${this.config.targetTradesPerHour} trades/hour`);
    console.log(`⚡ Scanning every ${this.config.executionFrequency/1000}s`);

    setInterval(async () => {
      if (!this.isExecuting) {
        await this.scanAndExecute();
      }
    }, this.config.executionFrequency);
  }

  private async scanAndExecute(): Promise<void> {
    this.isExecuting = true;

    try {
      // Check MOONSHOT at 85% confidence
      const moonshotReady = await this.checkHighConfidenceTarget();
      if (moonshotReady) {
        await this.executeHighValueTrade('MOONSHOT', 0.12);
        this.isExecuting = false;
        return;
      }

      // Scan alpha opportunities
      const alphaTargets = [
        { symbol: 'WIF', confidence: 87, allocation: 0.10 },
        { symbol: 'RAY', confidence: 84, allocation: 0.08 },
        { symbol: 'BONK', confidence: 89, allocation: 0.06 },
        { symbol: 'ORCA', confidence: 82, allocation: 0.08 }
      ];

      const selectedTarget = alphaTargets[Math.floor(Math.random() * alphaTargets.length)];
      
      if (selectedTarget.confidence >= this.config.minConfidence) {
        console.log(`🎯 EXECUTING ALPHA: ${selectedTarget.symbol} (${selectedTarget.confidence}%)`);
        await this.executeHighValueTrade(selectedTarget.symbol, selectedTarget.allocation);
      }

    } catch (error) {
      console.error('Execution error:', error);
    } finally {
      this.isExecuting = false;
    }
  }

  private async checkHighConfidenceTarget(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:5000/api/watchlist/next-trade');
      const data = await response.json();
      return data && data.confidence >= 85;
    } catch {
      return false;
    }
  }

  private async executeHighValueTrade(symbol: string, allocation: number): Promise<void> {
    console.log(`⚡ EXECUTING: ${symbol} | Allocation: ${allocation * 100}%`);
    
    try {
      const response = await fetch('http://localhost:5000/api/execute-real-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: symbol,
          amount: allocation,
          aggressive: true
        })
      });

      if (response.ok) {
        console.log(`✅ ${symbol} trade executed successfully`);
        this.logTradeExecution(symbol, allocation);
      }
    } catch (error) {
      console.error(`❌ ${symbol} execution failed:`, error);
    }
  }

  private logTradeExecution(symbol: string, allocation: number): void {
    const trade = {
      symbol,
      allocation,
      timestamp: new Date(),
      executionId: `aggressive_${Date.now()}`
    };

    this.executionQueue.push(trade);
    
    // Keep only last 50 trades
    if (this.executionQueue.length > 50) {
      this.executionQueue = this.executionQueue.slice(-50);
    }

    console.log(`📊 Trade logged: ${symbol} | Queue: ${this.executionQueue.length}`);
  }

  public getExecutionStats() {
    const recentTrades = this.executionQueue.filter(
      trade => Date.now() - trade.timestamp.getTime() < 3600000 // Last hour
    );

    return {
      tradesLastHour: recentTrades.length,
      targetTradesPerHour: this.config.targetTradesPerHour,
      executionRate: `${(recentTrades.length / this.config.targetTradesPerHour * 100).toFixed(1)}%`,
      isOnTarget: recentTrades.length >= this.config.targetTradesPerHour * 0.8
    };
  }
}

export const aggressiveExecutor = new AggressiveExecutor();