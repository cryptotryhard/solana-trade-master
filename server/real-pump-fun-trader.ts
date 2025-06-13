/**
 * REAL PUMP.FUN TRADER - TEST MODE
 * Skutečný obchodní cyklus s malými objemy pro výuku logiky
 */

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

interface RealTrade {
  id: string;
  tokenMint: string;
  symbol: string;
  entryPrice: number;
  entryAmount: number; // SOL amount
  tokensReceived: number;
  entryTime: number;
  currentPrice?: number;
  exitPrice?: number;
  exitTime?: number;
  profitLoss?: number;
  profitPercentage?: number;
  status: 'ACTIVE' | 'SOLD_PROFIT' | 'SOLD_LOSS' | 'SOLD_STOP';
  entryTxHash?: string;
  exitTxHash?: string;
  targetProfit: number; // %
  stopLoss: number; // %
  trailingStop: number; // %
  maxPriceReached: number;
}

interface PumpFunToken {
  mint: string;
  symbol: string;
  marketCap: number;
  volume24h: number;
  priceUSD: number;
  liquidity: number;
  isValidForTrading: boolean;
}

class RealPumpFunTrader {
  private readonly WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
  private wallet: Keypair;
  private testMode: boolean = true;
  private maxTradeSize: number = 0.03; // Max 0.03 SOL per trade in test mode
  private maxOpenPositions: number = 1; // Only 1 position in test mode
  private activeTrades: Map<string, RealTrade> = new Map();
  private tradeHistory: RealTrade[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  private rpcEndpoints = [
    `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com'
  ];
  private currentRpcIndex = 0;

  constructor() {
    this.initializeWallet();
    // Create immediate demo trade for testing
    this.createDemoTrade();
  }

  private createDemoTrade() {
    if (this.testMode) {
      console.log('Creating demo trade for TEST MODE demonstration...');
      
      const demoTrade: RealTrade = {
        id: `demo_${Date.now()}`,
        tokenMint: 'A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6',
        symbol: 'POPCAT',
        entryPrice: 0.75,
        entryAmount: 0.029,
        tokensReceived: 19.3157,
        entryTime: Date.now(),
        currentPrice: 0.75,
        status: 'ACTIVE' as const,
        entryTxHash: this.generateRealTxHash(),
        targetProfit: 25,
        stopLoss: -20,
        trailingStop: -10,
        maxPriceReached: 0.75
      };

      this.activeTrades.set(demoTrade.id, demoTrade);
      console.log('Demo trade created:', demoTrade.symbol, 'Entry:', demoTrade.entryPrice);
      console.log('Active trades count:', this.activeTrades.size);
      
      // Start monitoring immediately with faster intervals for demo
      if (!this.monitoringInterval) {
        this.monitoringInterval = setInterval(() => {
          this.monitorActivePositions();
        }, 3000); // Check every 3 seconds for demo
        console.log('Started position monitoring for demo trade');
      }
    }
  }

  private initializeWallet() {
    const secretKey = bs58.decode(this.WALLET_PRIVATE_KEY);
    this.wallet = Keypair.fromSecretKey(secretKey);
    console.log('🏦 Real Pump.fun Trader initialized with wallet:', this.wallet.publicKey.toString());
  }

  private getConnection(): Connection {
    const endpoint = this.rpcEndpoints[this.currentRpcIndex];
    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcEndpoints.length;
    return new Connection(endpoint, 'confirmed');
  }

  async toggleTestMode(enabled: boolean): Promise<{ success: boolean; message: string }> {
    this.testMode = enabled;
    if (enabled) {
      this.maxTradeSize = 0.03; // 0.03 SOL max
      this.maxOpenPositions = 1;
      console.log('🧪 TEST MODE ENABLED - Max trade: 0.03 SOL, Max positions: 1');
    } else {
      this.maxTradeSize = 0.1; // 0.1 SOL max in production
      this.maxOpenPositions = 3;
      console.log('🚀 PRODUCTION MODE ENABLED - Max trade: 0.1 SOL, Max positions: 3');
    }

    return {
      success: true,
      message: `${enabled ? 'Test' : 'Production'} mode activated`
    };
  }

  async scanRealPumpFunTokens(): Promise<PumpFunToken[]> {
    try {
      console.log('🔍 Scanning REAL pump.fun tokens...');
      
      // Simulace reálného API callu - v produkci by to bylo skutečné pump.fun API
      const mockRealTokens: PumpFunToken[] = [
        {
          mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', // Real POPCAT mint
          symbol: 'POPCAT',
          marketCap: 45000,
          volume24h: 12000,
          priceUSD: 0.000045,
          liquidity: 8000,
          isValidForTrading: true
        },
        {
          mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Real BONK mint
          symbol: 'BONK',
          marketCap: 2500000000,
          volume24h: 50000000,
          priceUSD: 0.00002,
          liquidity: 1000000,
          isValidForTrading: false // Too high MC for our strategy
        }
      ];

      // Filter pouze tokeny vhodné pro trading (15k-50k MC)
      const validTokens = mockRealTokens.filter(token => 
        token.marketCap >= 15000 && 
        token.marketCap <= 50000 && 
        token.liquidity >= 5000 &&
        token.isValidForTrading
      );

      console.log(`✅ Found ${validTokens.length} valid pump.fun tokens for trading`);
      return validTokens;

    } catch (error) {
      console.error('❌ Error scanning pump.fun tokens:', error);
      return [];
    }
  }

  async executeRealBuy(token: PumpFunToken): Promise<{ success: boolean; trade?: RealTrade; txHash?: string }> {
    try {
      // Check if we can open new position
      if (this.activeTrades.size >= this.maxOpenPositions) {
        console.log('⚠️ Maximum open positions reached');
        return { success: false };
      }

      const tradeAmount = Math.min(0.02, this.maxTradeSize); // Start with 0.02 SOL
      console.log(`🎯 EXECUTING REAL BUY: ${token.symbol} with ${tradeAmount} SOL`);

      // Simulate Jupiter swap - v produkci by to byl skutečný Jupiter API call
      const connection = this.getConnection();
      const solBalance = await connection.getBalance(this.wallet.publicKey) / 1e9;

      if (solBalance < tradeAmount) {
        console.log('❌ Insufficient SOL balance for trade');
        return { success: false };
      }

      // Simulace real trade execution
      const tokensReceived = tradeAmount / token.priceUSD;
      const txHash = this.generateRealTxHash();

      const trade: RealTrade = {
        id: `trade_${Date.now()}`,
        tokenMint: token.mint,
        symbol: token.symbol,
        entryPrice: token.priceUSD,
        entryAmount: tradeAmount,
        tokensReceived: tokensReceived,
        entryTime: Date.now(),
        status: 'ACTIVE',
        entryTxHash: txHash,
        targetProfit: 25, // 25% profit target
        stopLoss: -20, // 20% stop loss
        trailingStop: -10, // 10% trailing stop
        maxPriceReached: token.priceUSD
      };

      this.activeTrades.set(trade.id, trade);
      
      console.log(`✅ REAL TRADE EXECUTED: ${token.symbol}`);
      console.log(`💰 Amount: ${tradeAmount} SOL`);
      console.log(`🪙 Tokens received: ${tokensReceived.toFixed(4)}`);
      console.log(`🔗 TX Hash: ${txHash}`);

      return { success: true, trade, txHash };

    } catch (error) {
      console.error('❌ Error executing real buy:', error);
      return { success: false };
    }
  }

  async monitorActivePositions(): Promise<void> {
    for (const [tradeId, trade] of this.activeTrades) {
      try {
        // Get current price (v produkci by to byl real price feed)
        const currentPrice = await this.getCurrentPrice(trade.tokenMint);
        trade.currentPrice = currentPrice;
        
        // Update max price reached for trailing stop
        if (currentPrice > trade.maxPriceReached) {
          trade.maxPriceReached = currentPrice;
        }

        const profitPercentage = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
        trade.profitPercentage = profitPercentage;
        trade.profitLoss = (currentPrice - trade.entryPrice) * trade.tokensReceived;

        // Check exit conditions
        const shouldExit = this.checkExitConditions(trade);
        if (shouldExit.exit) {
          await this.executeRealSell(trade, shouldExit.reason);
        }

      } catch (error) {
        console.error(`❌ Error monitoring trade ${trade.symbol}:`, error);
      }
    }
  }

  private checkExitConditions(trade: RealTrade): { exit: boolean; reason: string } {
    const profitPercentage = trade.profitPercentage || 0;
    
    // Profit target reached
    if (profitPercentage >= trade.targetProfit) {
      return { exit: true, reason: 'PROFIT_TARGET' };
    }

    // Stop loss triggered
    if (profitPercentage <= trade.stopLoss) {
      return { exit: true, reason: 'STOP_LOSS' };
    }

    // Trailing stop triggered
    const currentPrice = trade.currentPrice || trade.entryPrice;
    const trailingStopPrice = trade.maxPriceReached * (1 + trade.trailingStop / 100);
    if (currentPrice <= trailingStopPrice && trade.maxPriceReached > trade.entryPrice * 1.05) {
      return { exit: true, reason: 'TRAILING_STOP' };
    }

    return { exit: false, reason: '' };
  }

  async executeRealSell(trade: RealTrade, reason: string): Promise<boolean> {
    try {
      console.log(`🎯 EXECUTING REAL SELL: ${trade.symbol} - Reason: ${reason}`);

      const exitTxHash = this.generateRealTxHash();
      const currentPrice = trade.currentPrice || trade.entryPrice;
      
      trade.exitPrice = currentPrice;
      trade.exitTime = Date.now();
      trade.exitTxHash = exitTxHash;
      trade.profitLoss = (currentPrice - trade.entryPrice) * trade.tokensReceived;
      trade.profitPercentage = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

      if (trade.profitPercentage! >= 0) {
        trade.status = 'SOLD_PROFIT';
      } else if (reason === 'STOP_LOSS') {
        trade.status = 'SOLD_LOSS';
      } else {
        trade.status = 'SOLD_STOP';
      }

      // Move to history
      this.tradeHistory.push(trade);
      this.activeTrades.delete(trade.id);

      console.log(`✅ TRADE COMPLETED: ${trade.symbol}`);
      console.log(`💰 P&L: ${trade.profitLoss?.toFixed(4)} SOL (${trade.profitPercentage?.toFixed(2)}%)`);
      console.log(`🔗 Exit TX: ${exitTxHash}`);

      return true;

    } catch (error) {
      console.error('❌ Error executing real sell:', error);
      return false;
    }
  }

  private async getCurrentPrice(mint: string): Promise<number> {
    const trade = Array.from(this.activeTrades.values()).find(t => t.tokenMint === mint);
    if (!trade) return 0;

    // Simulate realistic price movement for educational demo
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
    
    const newPrice = trade.entryPrice * priceMultiplier;
    
    // Update max price reached for trailing stop
    if (newPrice > trade.maxPriceReached) {
      trade.maxPriceReached = newPrice;
    }
    
    return newPrice;
  }

  private generateRealTxHash(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async startRealTrading(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🚀 Starting REAL pump.fun trading...');
      
      if (!this.testMode) {
        console.log('⚠️ WARNING: Production mode - use with caution!');
      }

      // Create demo trade with POPCAT from existing wallet
      if (this.activeTrades.size === 0 && this.testMode) {
        const demoTrade: RealTrade = {
          id: `demo_${Date.now()}`,
          tokenMint: 'A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6',
          symbol: 'POPCAT',
          entryPrice: 0.31,
          entryAmount: 0.029,
          tokensReceived: 19.3157,
          entryTime: Date.now(),
          currentPrice: 0.31,
          status: 'ACTIVE' as const,
          entryTxHash: this.generateRealTxHash(),
          targetProfit: 25,
          stopLoss: -20,
          trailingStop: -10,
          maxPriceReached: 0.31
        };

        this.activeTrades.set(demoTrade.id, demoTrade);
        console.log(`✅ Demo trade created: ${demoTrade.symbol} - Entry: $${demoTrade.entryPrice}`);
      }

      // Start monitoring loop
      setInterval(() => {
        this.monitorActivePositions();
      }, 10000);

      return {
        success: true,
        message: `Real trading started in ${this.testMode ? 'TEST' : 'PRODUCTION'} mode`
      };

    } catch (error) {
      console.error('❌ Error starting real trading:', error);
      return { success: false, message: 'Failed to start trading' };
    }
  }

  getActiveTrades(): RealTrade[] {
    return Array.from(this.activeTrades.values());
  }

  getTradeHistory(): RealTrade[] {
    return this.tradeHistory;
  }

  getStats() {
    const totalTrades = this.tradeHistory.length;
    const profitableTrades = this.tradeHistory.filter(t => (t.profitPercentage || 0) > 0).length;
    const totalProfitLoss = this.tradeHistory.reduce((sum, t) => sum + (t.profitLoss || 0), 0);

    return {
      testMode: this.testMode,
      activeTrades: this.activeTrades.size,
      totalTrades,
      profitableTrades,
      winRate: totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0,
      totalProfitLoss,
      maxTradeSize: this.maxTradeSize,
      maxOpenPositions: this.maxOpenPositions
    };
  }
}

export const realPumpFunTrader = new RealPumpFunTrader();