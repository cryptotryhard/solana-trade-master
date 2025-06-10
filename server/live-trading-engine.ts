import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { jupiterSwapEngine } from './jupiter-swap-engine';

interface LiveTrade {
  id: string;
  symbol: string;
  mintAddress: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: Date;
  confidence: number;
  strategy: string;
  walletAddress: string;
  status: 'pending' | 'executed' | 'failed';
  txHash?: string;
  actualPrice?: number;
  slippage?: number;
  gasUsed?: number;
  pnl?: number;
}

interface TradingMetrics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalVolume: number;
  totalPnL: number;
  successRate: number;
  avgTradeSize: number;
  largestWin: number;
  largestLoss: number;
  activePositions: number;
}

class LiveTradingEngine {
  private isActive: boolean = false;
  private trades: LiveTrade[] = [];
  private connection: Connection;
  private walletAddress: string = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
  private maxTradeSize: number = 0.1; // Max 0.1 SOL per trade for safety
  private minBalance: number = 2.0; // Keep minimum 2 SOL in wallet
  private tradingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    console.log('🚀 Live Trading Engine initialized');
    
    // Auto-activate for immediate real trading
    setTimeout(() => {
      this.activate();
    }, 2000);
  }

  async activate(): Promise<void> {
    if (this.isActive) {
      console.log('🔄 Live trading already active');
      return;
    }

    this.isActive = true;
    console.log('🚀 Live Trading Engine ACTIVATED - Real transactions enabled');
    console.log(`💰 Wallet: ${this.walletAddress}`);
    console.log(`🎯 Max trade size: ${this.maxTradeSize} SOL`);
    console.log(`🛡️ Minimum balance: ${this.minBalance} SOL`);
    
    // Start monitoring for trading opportunities
    this.startTradingLoop();
  }

  private startTradingLoop(): void {
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
    }

    // Check for trading opportunities every 30 seconds
    this.tradingInterval = setInterval(async () => {
      await this.checkTradingOpportunities();
    }, 30000);

    console.log('⚡ Live trading loop started - checking opportunities every 30 seconds');
  }

  private async checkTradingOpportunities(): Promise<void> {
    try {
      // Get current balance first
      const balance = await this.getWalletBalance();
      
      if (balance < this.minBalance + this.maxTradeSize) {
        console.log(`⚠️ Insufficient balance for trading: ${balance} SOL (min required: ${this.minBalance + this.maxTradeSize} SOL)`);
        return;
      }

      // Check for alpha opportunities from our scanners
      const alphaTokens = await this.getAlphaOpportunities();
      
      for (const token of alphaTokens) {
        if (this.shouldExecuteTrade(token)) {
          await this.executeLiveTrade(token);
        }
      }
    } catch (error) {
      console.error('Error checking trading opportunities:', error);
    }
  }

  private async getAlphaOpportunities(): Promise<any[]> {
    try {
      // Fetch from our alpha acceleration engine
      const response = await fetch('http://localhost:5000/api/alpha/tokens');
      const tokens = await response.json();
      
      return tokens.filter((token: any) => 
        token.confidence > 0.20 && // Lowered from 0.8 to 0.20 for real market conditions
        token.mintAddress &&
        token.symbol
      );
    } catch (error) {
      console.error('Error fetching alpha opportunities:', error);
      return [];
    }
  }

  private shouldExecuteTrade(token: any): boolean {
    // Risk management checks - lowered threshold for testing
    if (token.confidence < 0.15) return false; // Further lowered for testing
    if (!token.mintAddress || !token.symbol) return false;
    
    // Check if we already have a position in this token
    const existingPosition = this.trades.find(trade => 
      trade.mintAddress === token.mintAddress && 
      trade.status === 'executed' &&
      trade.side === 'buy'
    );
    
    if (existingPosition) return false;
    
    // Additional safety checks
    if (token.signals && token.signals.includes('rug_risk')) return false;
    
    console.log(`🎯 Trade candidate: ${token.symbol} (confidence: ${token.confidence})`);
    return true;
  }

  // Force execute a trade for testing purposes
  async forceExecuteTrade(tokenSymbol?: string): Promise<any> {
    console.log(`🔥 FORCE EXECUTING TRADE - REAL JUPITER SWAP`);
    
    try {
      // Get available alpha tokens
      const alphaTokens = await this.getAlphaOpportunities();
      console.log(`📊 Found ${alphaTokens.length} alpha opportunities`);
      
      let targetToken = alphaTokens[0]; // Default to first token
      
      if (tokenSymbol) {
        const specificToken = alphaTokens.find(t => t.symbol === tokenSymbol);
        if (specificToken) {
          targetToken = specificToken;
        }
      }
      
      if (!targetToken) {
        return { success: false, error: 'No suitable alpha tokens found' };
      }
      
      console.log(`🎯 Force executing trade for: ${targetToken.symbol} (${targetToken.mintAddress})`);
      
      // Execute the trade regardless of normal checks
      await this.executeLiveTrade(targetToken);
      
      return { 
        success: true, 
        token: targetToken.symbol,
        mintAddress: targetToken.mintAddress
      };
    } catch (error) {
      console.error('❌ Force trade execution failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async executeLiveTrade(token: any): Promise<void> {
    console.log(`🎯 Executing LIVE trade for ${token.symbol} (${token.mintAddress})`);
    
    const trade: LiveTrade = {
      id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: token.symbol,
      mintAddress: token.mintAddress,
      side: 'buy',
      amount: Math.min(this.maxTradeSize, 0.1), // Start with smaller amounts
      price: token.price || 0,
      timestamp: new Date(),
      confidence: token.confidence,
      strategy: 'alpha_acceleration',
      walletAddress: this.walletAddress,
      status: 'pending'
    };

    try {
      // Execute the actual Jupiter swap
      const swapResult = await this.executeJupiterSwap(trade);
      
      if (swapResult.success) {
        trade.status = 'executed';
        trade.txHash = swapResult.txHash;
        trade.actualPrice = swapResult.actualPrice;
        trade.slippage = swapResult.slippage;
        trade.gasUsed = swapResult.gasUsed;
        
        console.log(`✅ Live trade executed: ${trade.symbol} - TX: ${trade.txHash}`);
      } else {
        trade.status = 'failed';
        console.log(`❌ Live trade failed: ${trade.symbol} - ${swapResult.error}`);
      }
    } catch (error) {
      trade.status = 'failed';
      console.error(`💥 Live trade error for ${trade.symbol}:`, error);
    }

    this.trades.push(trade);
  }

  private async executeJupiterSwap(trade: LiveTrade): Promise<any> {
    try {
      console.log(`🔄 Executing Jupiter swap: ${trade.amount} SOL -> ${trade.symbol}`);
      
      // Use the proper Jupiter swap engine
      const swapResult = await jupiterSwapEngine.swapSolToToken(
        trade.mintAddress,
        trade.amount,
        this.walletAddress,
        100 // 1% slippage tolerance
      );

      console.log(`⚡ Jupiter swap result: ${JSON.stringify(swapResult)}`);
      return swapResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deactivate(): Promise<void> {
    if (!this.isActive) {
      console.log('⚠️ Live trading already inactive');
      return;
    }

    this.isActive = false;
    
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = null;
    }
    
    console.log('🛑 Live trading deactivated');
  }

  async getWalletBalance(): Promise<number> {
    try {
      const publicKey = new PublicKey(this.walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return 0;
    }
  }

  getStatus(): any {
    return {
      active: this.isActive,
      totalTrades: this.trades.length,
      executedTrades: this.trades.filter(t => t.status === 'executed').length,
      failedTrades: this.trades.filter(t => t.status === 'failed').length,
      walletAddress: this.walletAddress,
      maxTradeSize: this.maxTradeSize,
      minBalance: this.minBalance
    };
  }

  getRecentTrades(limit: number = 10): LiveTrade[] {
    return this.trades
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Additional methods for API compatibility
  getLiveTrades(): LiveTrade[] {
    return this.trades;
  }

  getTradingStatus(): any {
    return this.getStatus();
  }

  getTradingMetrics(): TradingMetrics {
    const executedTrades = this.trades.filter(t => t.status === 'executed');
    const successfulTrades = executedTrades.filter(t => (t.pnl || 0) > 0);
    
    return {
      totalTrades: this.trades.length,
      successfulTrades: successfulTrades.length,
      failedTrades: this.trades.filter(t => t.status === 'failed').length,
      totalVolume: executedTrades.reduce((sum, t) => sum + t.amount, 0),
      totalPnL: executedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
      successRate: executedTrades.length > 0 ? (successfulTrades.length / executedTrades.length) * 100 : 0,
      avgTradeSize: executedTrades.length > 0 ? executedTrades.reduce((sum, t) => sum + t.amount, 0) / executedTrades.length : 0,
      largestWin: Math.max(...executedTrades.map(t => t.pnl || 0), 0),
      largestLoss: Math.min(...executedTrades.map(t => t.pnl || 0), 0),
      activePositions: executedTrades.filter(t => t.side === 'buy').length
    };
  }
}

export const liveTradingEngine = new LiveTradingEngine();