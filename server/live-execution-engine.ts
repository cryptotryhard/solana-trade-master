import { Connection, PublicKey, Transaction, sendAndConfirmTransaction, Keypair } from '@solana/web3.js';
import { jupiterSwapEngine } from './jupiter-swap-engine';
import { realPortfolioTracker } from './real-portfolio-tracker';

interface LiveTrade {
  id: string;
  symbol: string;
  mintAddress: string;
  side: 'buy' | 'sell';
  amount: number;
  targetPrice: number;
  actualPrice?: number;
  txHash?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  timestamp: Date;
  profit?: number;
}

interface ExecutionSettings {
  maxSlippage: number;
  priorityFee: number;
  maxRetries: number;
  enabled: boolean;
  testMode: boolean;
}

class LiveExecutionEngine {
  private connection: Connection;
  private activeTrades: Map<string, LiveTrade> = new Map();
  private completedTrades: LiveTrade[] = [];
  private settings: ExecutionSettings = {
    maxSlippage: 100, // 1%
    priorityFee: 1000000, // 0.001 SOL
    maxRetries: 3,
    enabled: true,
    testMode: true // Start in test mode for safety
  };

  constructor() {
    this.connection = new Connection('https://rpc.heliohost.org', 'confirmed');
    console.log('🔥 Live Execution Engine initialized');
  }

  async executeBuyOrder(symbol: string, mintAddress: string, amountSOL: number): Promise<LiveTrade> {
    const tradeId = `BUY_${symbol}_${Date.now()}`;
    
    const trade: LiveTrade = {
      id: tradeId,
      symbol,
      mintAddress,
      side: 'buy',
      amount: amountSOL,
      targetPrice: 0,
      status: 'pending',
      timestamp: new Date()
    };

    this.activeTrades.set(tradeId, trade);
    console.log(`🎯 EXECUTING BUY ORDER: ${symbol} - ${amountSOL} SOL`);

    try {
      trade.status = 'executing';
      
      if (this.settings.testMode) {
        // Enhanced simulation with realistic market behavior
        const simulatedPrice = Math.random() * 0.01 + 0.001;
        const simulatedSlippage = Math.random() * 0.5 + 0.1;
        const tokensReceived = (amountSOL / simulatedPrice) * (1 - simulatedSlippage / 100);
        
        trade.actualPrice = simulatedPrice;
        trade.txHash = `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        trade.status = 'completed';
        
        // Record in portfolio tracker
        realPortfolioTracker.recordRealTrade({
          timestamp: new Date(),
          symbol,
          side: 'buy',
          amount: tokensReceived,
          priceUSD: simulatedPrice,
          totalUSD: amountSOL,
          txHash: trade.txHash
        });

        console.log(`✅ SIMULATED BUY COMPLETED: ${symbol} - ${tokensReceived.toFixed(2)} tokens at $${simulatedPrice.toFixed(6)}`);
        
        this.activeTrades.delete(tradeId);
        this.completedTrades.push(trade);
        
        return trade;
      }

      // Real Jupiter API trading execution
      try {
        const swapResult = await jupiterSwapEngine.swapSolToToken(
          mintAddress,
          amountSOL,
          this.settings.maxSlippage
        );

        if (swapResult.success && swapResult.txHash) {
          trade.actualPrice = swapResult.actualPrice;
          trade.txHash = swapResult.txHash;
          trade.status = 'completed';
          
          // Record real trade
          realPortfolioTracker.recordRealTrade({
            timestamp: new Date(),
            symbol,
            side: 'buy',
            amount: swapResult.outputAmount || 0,
            priceUSD: swapResult.actualPrice || 0,
            totalUSD: amountSOL,
            txHash: swapResult.txHash
          });

          console.log(`✅ REAL BUY EXECUTED: ${symbol} - ${swapResult.outputAmount} tokens - TX: ${swapResult.txHash}`);
        } else {
          trade.status = 'failed';
          console.log(`❌ REAL BUY FAILED: ${symbol} - ${swapResult.error}`);
        }
      } catch (error) {
        trade.status = 'failed';
        console.log(`❌ REAL BUY ERROR: ${symbol} - ${error.message}`);
      }

      this.activeTrades.delete(tradeId);
      this.completedTrades.push(trade);
      return trade;

    } catch (error) {
      console.error(`❌ BUY ORDER FAILED: ${symbol} - ${error.message}`);
      trade.status = 'failed';
      this.activeTrades.delete(tradeId);
      this.completedTrades.push(trade);
      return trade;
    }
  }

  async executeSellOrder(symbol: string, mintAddress: string, percentage: number): Promise<LiveTrade> {
    const tradeId = `SELL_${symbol}_${Date.now()}`;
    
    const trade: LiveTrade = {
      id: tradeId,
      symbol,
      mintAddress,
      side: 'sell',
      amount: percentage,
      targetPrice: 0,
      status: 'pending',
      timestamp: new Date()
    };

    this.activeTrades.set(tradeId, trade);
    console.log(`🎯 EXECUTING SELL ORDER: ${symbol} - ${percentage}%`);

    try {
      trade.status = 'executing';
      
      if (this.settings.testMode) {
        // Enhanced simulation with profit calculation
        const currentPrice = Math.random() * 0.02 + 0.001;
        const sellAmount = Math.random() * 100 + 50; // Random position size
        const sellValue = sellAmount * currentPrice;
        const profit = sellValue * (Math.random() * 0.3 - 0.1); // -10% to +20% profit
        
        trade.actualPrice = currentPrice;
        trade.profit = profit;
        trade.txHash = `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        trade.status = 'completed';
        
        // Record in portfolio tracker
        realPortfolioTracker.recordRealTrade({
          timestamp: new Date(),
          symbol,
          side: 'sell',
          amount: sellAmount,
          priceUSD: currentPrice,
          totalUSD: sellValue,
          txHash: trade.txHash,
          pnlUSD: profit
        });

        console.log(`✅ SIMULATED SELL COMPLETED: ${symbol} - $${sellValue.toFixed(2)} (PnL: $${profit.toFixed(2)})`);
        
        this.activeTrades.delete(tradeId);
        this.completedTrades.push(trade);
        
        return trade;
      }

      // Real trading implementation would go here
      throw new Error('Real trading not yet enabled - use test mode');

    } catch (error) {
      console.error(`❌ SELL ORDER FAILED: ${symbol} - ${error.message}`);
      trade.status = 'failed';
      this.activeTrades.delete(tradeId);
      this.completedTrades.push(trade);
      return trade;
    }
  }

  async forceExitPosition(symbol: string, reason: string): Promise<LiveTrade> {
    console.log(`🚨 FORCE EXIT: ${symbol} - Reason: ${reason}`);
    return this.executeSellOrder(symbol, '', 100);
  }

  getActiveTrades(): LiveTrade[] {
    return Array.from(this.activeTrades.values());
  }

  getCompletedTrades(limit: number = 50): LiveTrade[] {
    return this.completedTrades.slice(-limit);
  }

  getTradeMetrics(): {
    totalTrades: number;
    successRate: number;
    totalProfit: number;
    avgProfit: number;
  } {
    const completed = this.completedTrades.filter(t => t.status === 'completed');
    const profitable = completed.filter(t => t.profit && t.profit > 0);
    const totalProfit = completed.reduce((sum, t) => sum + (t.profit || 0), 0);

    return {
      totalTrades: completed.length,
      successRate: completed.length > 0 ? (profitable.length / completed.length) * 100 : 0,
      totalProfit,
      avgProfit: completed.length > 0 ? totalProfit / completed.length : 0
    };
  }

  enableLiveTrading(): void {
    this.settings.testMode = false;
    console.log('🔥 LIVE TRADING ENABLED - Real executions will occur');
  }

  enableTestMode(): void {
    this.settings.testMode = true;
    console.log('🧪 TEST MODE ENABLED - Simulated executions only');
  }

  updateSettings(newSettings: Partial<ExecutionSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    console.log('⚙️ Execution settings updated:', this.settings);
  }

  getSettings(): ExecutionSettings {
    return { ...this.settings };
  }
}

export const liveExecutionEngine = new LiveExecutionEngine();