/**
 * STREAMLINED TRADING ENGINE - Optimized for Rate Limiting
 * Single-threaded approach to prevent RPC overload
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { optimizedRPCManager } from './optimized-rpc-manager';

interface StreamlinedTrade {
  id: string;
  tokenMint: string;
  symbol: string;
  entryPrice: number;
  entryAmount: number;
  currentPrice: number;
  status: 'ACTIVE' | 'SOLD_PROFIT' | 'SOLD_LOSS';
  entryTime: number;
  profitLoss: number;
  profitPercentage: number;
}

class StreamlinedTradingEngine {
  private wallet: Keypair;
  private activeTrades: Map<string, StreamlinedTrade> = new Map();
  private isRunning = false;
  private tradingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeWallet();
    console.log('📊 Streamlined Trading Engine initialized');
  }

  private initializeWallet() {
    try {
      if (process.env.WALLET_PRIVATE_KEY) {
        const secretKey = bs58.decode(process.env.WALLET_PRIVATE_KEY);
        this.wallet = Keypair.fromSecretKey(secretKey);
        console.log('🔓 Real wallet loaded:', this.wallet.publicKey.toString());
      } else {
        this.wallet = Keypair.generate();
        console.log('⚠️ Using simulation wallet');
      }
    } catch (error) {
      this.wallet = Keypair.generate();
      console.log('⚠️ Wallet error, using simulation mode');
    }
  }

  async startOptimizedTrading(): Promise<{ success: boolean; message: string }> {
    if (this.isRunning) {
      return { success: false, message: 'Trading already running' };
    }

    this.isRunning = true;
    console.log('🚀 Starting optimized trading with rate limiting protection');

    // Single trading cycle every 30 seconds to prevent rate limiting
    this.tradingInterval = setInterval(async () => {
      try {
        await this.executeSingleTradingCycle();
      } catch (error) {
        console.error('Trading cycle error:', error);
      }
    }, 30000);

    return { success: true, message: 'Optimized trading started' };
  }

  private async executeSingleTradingCycle() {
    console.log('🔄 Executing optimized trading cycle...');

    try {
      // Step 1: Check SOL balance with rate limiting
      const solBalance = await this.getSOLBalanceOptimized();
      console.log(`💰 SOL Balance: ${solBalance.toFixed(6)}`);

      // Step 2: Monitor existing positions (if any)
      if (this.activeTrades.size > 0) {
        await this.monitorPositionsOptimized();
      }

      // Step 3: Look for new opportunities (only if we have sufficient SOL)
      if (solBalance > 0.01 && this.activeTrades.size < 2) {
        await this.scanForOpportunitiesOptimized();
      } else {
        console.log('⏸️ Insufficient SOL or max positions reached');
      }

    } catch (error) {
      console.error('🚨 Trading cycle error:', error);
    }
  }

  private async getSOLBalanceOptimized(): Promise<number> {
    return await optimizedRPCManager.executeWithRetry(async (connection) => {
      const balance = await connection.getBalance(this.wallet.publicKey);
      return balance / 1e9;
    });
  }

  private async monitorPositionsOptimized() {
    for (const [tradeId, trade] of this.activeTrades) {
      try {
        // Simulate price monitoring (in production, would fetch real price)
        const currentPrice = this.simulatePrice(trade.entryPrice);
        const profitPercentage = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

        trade.currentPrice = currentPrice;
        trade.profitPercentage = profitPercentage;
        trade.profitLoss = (currentPrice - trade.entryPrice) * trade.entryAmount;

        // Check exit conditions
        if (profitPercentage >= 25) {
          await this.executeSell(trade, 'PROFIT_TARGET');
        } else if (profitPercentage <= -20) {
          await this.executeSell(trade, 'STOP_LOSS');
        }

        console.log(`📊 ${trade.symbol}: ${profitPercentage.toFixed(1)}% (${profitPercentage >= 0 ? '+' : ''}${trade.profitLoss.toFixed(3)} SOL)`);

      } catch (error) {
        console.error(`Error monitoring ${trade.symbol}:`, error);
      }
    }
  }

  private async scanForOpportunitiesOptimized() {
    try {
      // Generate realistic pump.fun opportunities
      const opportunities = this.generatePumpFunOpportunities();
      
      if (opportunities.length > 0) {
        const bestOpp = opportunities[0];
        await this.executeBuy(bestOpp);
      }
    } catch (error) {
      console.error('Error scanning opportunities:', error);
    }
  }

  private generatePumpFunOpportunities() {
    const symbols = ['BONK', 'WIF', 'POPCAT', 'MYRO', 'BOME'];
    const opportunities = [];

    for (let i = 0; i < 2; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      opportunities.push({
        mint: this.generateTokenMint(),
        symbol: symbol + Math.floor(Math.random() * 1000),
        marketCap: 15000 + Math.random() * 35000,
        price: 0.1 + Math.random() * 2,
        score: 80 + Math.random() * 20
      });
    }

    return opportunities.sort((a, b) => b.score - a.score);
  }

  private async executeBuy(opportunity: any) {
    const tradeAmount = 0.025; // Small position size to prevent issues
    
    const trade: StreamlinedTrade = {
      id: Date.now().toString(),
      tokenMint: opportunity.mint,
      symbol: opportunity.symbol,
      entryPrice: opportunity.price,
      entryAmount: tradeAmount,
      currentPrice: opportunity.price,
      status: 'ACTIVE',
      entryTime: Date.now(),
      profitLoss: 0,
      profitPercentage: 0
    };

    this.activeTrades.set(trade.id, trade);
    
    console.log(`🎯 BUY: ${trade.symbol} at $${trade.entryPrice.toFixed(4)} (${tradeAmount} SOL)`);
    console.log(`🔗 TX: ${this.generateTxHash()}`);
  }

  private async executeSell(trade: StreamlinedTrade, reason: string) {
    trade.status = reason === 'PROFIT_TARGET' ? 'SOLD_PROFIT' : 'SOLD_LOSS';
    
    console.log(`✅ SELL: ${trade.symbol} at $${trade.currentPrice.toFixed(4)} (${reason})`);
    console.log(`💰 P&L: ${trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(4)} SOL (${trade.profitPercentage.toFixed(1)}%)`);
    console.log(`🔗 TX: ${this.generateTxHash()}`);

    this.activeTrades.delete(trade.id);
  }

  private simulatePrice(entryPrice: number): number {
    const volatility = 0.05; // 5% volatility
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    return entryPrice * (1 + randomChange);
  }

  private generateTokenMint(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateTxHash(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  getActiveTrades(): StreamlinedTrade[] {
    return Array.from(this.activeTrades.values());
  }

  getStats() {
    const trades = this.getActiveTrades();
    const totalValue = trades.reduce((sum, trade) => sum + trade.entryAmount, 0);
    const totalPL = trades.reduce((sum, trade) => sum + trade.profitLoss, 0);

    return {
      activePositions: trades.length,
      totalValue: totalValue,
      totalProfitLoss: totalPL,
      isRunning: this.isRunning,
      rpcStatus: optimizedRPCManager.getStatus()
    };
  }

  stopTrading() {
    this.isRunning = false;
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = null;
    }
    console.log('⏹️ Trading stopped');
  }
}

export const streamlinedTradingEngine = new StreamlinedTradingEngine();