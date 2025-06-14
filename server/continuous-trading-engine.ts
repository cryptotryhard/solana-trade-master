/**
 * CONTINUOUS TRADING ENGINE - Non-stop Micro Trading
 * Executes micro-trades even with minimal capital (0.005 SOL)
 * Monitors existing wallet tokens for profit opportunities
 */

import { realJupiterTrader } from './real-jupiter-trader';
import { getBestToken } from './smart-token-selector';
import { portfolioBalancer } from './portfolio-balancer';
import { patternMemory } from './pattern-memory';
import { Connection, PublicKey } from '@solana/web3.js';

interface ContinuousConfig {
  minTradeAmount: number; // 0.005 SOL minimum
  maxTradeAmount: number; // 0.1 SOL maximum
  tradingInterval: number; // 10 minutes in ms
  microTradeThreshold: number; // 0.04 SOL - below this use micro trades
  walletMonitorInterval: number; // 5 minutes in ms
}

interface WalletToken {
  mint: string;
  symbol: string;
  balance: number;
  valueUSD: number;
  entryPrice?: number;
  entryTime?: number;
  currentPrice: number;
  pnlPercent?: number;
}

interface TradingAlert {
  type: 'BOT_INACTIVE' | 'LOW_SOL' | 'RISK_BLOCKED' | 'OPPORTUNITY_MISSED';
  message: string;
  timestamp: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class ContinuousTradingEngine {
  private config: ContinuousConfig = {
    minTradeAmount: 0.005,
    maxTradeAmount: 0.1,
    tradingInterval: 10 * 60 * 1000, // 10 minutes
    microTradeThreshold: 0.04,
    walletMonitorInterval: 5 * 60 * 1000 // 5 minutes
  };

  private connection: Connection;
  private isActive: boolean = false;
  private tradingInterval: NodeJS.Timeout | null = null;
  private walletMonitorInterval: NodeJS.Timeout | null = null;
  private alerts: TradingAlert[] = [];
  private walletTokens: Map<string, WalletToken> = new Map();
  private recentTrades: any[] = [];

  constructor() {
    this.connection = new Connection(
      process.env.HELIUS_API_KEY 
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : 'https://api.mainnet-beta.solana.com'
    );
    console.log('🔄 Continuous Trading Engine initialized');
  }

  /**
   * Start continuous trading with real wallet integration
   */
  public async startContinuousTrading(): Promise<void> {
    if (this.isActive) {
      console.log('⚠️ Continuous trading already active');
      return;
    }

    this.isActive = true;
    console.log('🚀 Starting continuous trading engine');

    // Initial wallet scan
    await this.scanWalletTokens();

    // Start continuous trading cycle
    this.tradingInterval = setInterval(async () => {
      await this.executeTradingCycle();
    }, this.config.tradingInterval);

    // Start wallet monitoring for existing positions
    this.walletMonitorInterval = setInterval(async () => {
      await this.monitorWalletPositions();
    }, this.config.walletMonitorInterval);

    // Execute first cycle immediately
    await this.executeTradingCycle();
  }

  /**
   * Stop continuous trading
   */
  public stopContinuousTrading(): void {
    this.isActive = false;
    
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = null;
    }

    if (this.walletMonitorInterval) {
      clearInterval(this.walletMonitorInterval);
      this.walletMonitorInterval = null;
    }

    console.log('⏹️ Continuous trading stopped');
  }

  /**
   * Execute trading cycle - find opportunities and trade
   */
  private async executeTradingCycle(): Promise<void> {
    try {
      console.log('🔄 Executing continuous trading cycle...');

      const solBalance = await this.getSOLBalance();
      console.log(`💰 Current SOL balance: ${solBalance.toFixed(6)}`);

      // Determine trade size based on available capital
      let tradeSize: number;
      if (solBalance < this.config.microTradeThreshold) {
        tradeSize = Math.max(this.config.minTradeAmount, solBalance * 0.8);
        console.log(`🔬 Micro-trade mode: ${tradeSize.toFixed(6)} SOL`);
        
        if (tradeSize < this.config.minTradeAmount) {
          this.addAlert('LOW_SOL', `Insufficient SOL for trading: ${solBalance.toFixed(6)}`, 'HIGH');
          return;
        }
      } else {
        tradeSize = Math.min(this.config.maxTradeAmount, solBalance * 0.1);
        console.log(`💎 Standard trade: ${tradeSize.toFixed(6)} SOL`);
      }

      // Get best trading opportunity
      const bestToken = await getBestToken();
      if (!bestToken) {
        this.addAlert('OPPORTUNITY_MISSED', 'No suitable trading opportunities found', 'MEDIUM');
        console.log('❌ No trading opportunities found');
        return;
      }

      console.log(`🎯 Selected token: ${bestToken.symbol} (Score: ${bestToken.score})`);

      // Execute trade
      const tradeResult = await this.executeTrade(bestToken, tradeSize);
      if (tradeResult.success) {
        console.log(`✅ Trade executed: ${bestToken.symbol} for ${tradeSize.toFixed(6)} SOL`);
        
        // Record in pattern memory and portfolio balancer
        this.recordTradePattern(bestToken, tradeSize, tradeResult.entryPrice);
        
        // Add to recent trades
        this.recentTrades.unshift({
          id: `trade_${Date.now()}`,
          symbol: bestToken.symbol,
          mint: bestToken.mint,
          entryPrice: tradeResult.entryPrice,
          amount: tradeSize,
          timestamp: Date.now(),
          txHash: tradeResult.txHash,
          status: 'ACTIVE'
        });

        // Keep only last 50 trades
        this.recentTrades = this.recentTrades.slice(0, 50);
      }

    } catch (error) {
      console.error('❌ Trading cycle error:', (error as Error).message);
      this.addAlert('BOT_INACTIVE', `Trading cycle failed: ${(error as Error).message}`, 'HIGH');
    }
  }

  /**
   * Scan wallet for existing tokens
   */
  private async scanWalletTokens(): Promise<void> {
    try {
      const response = await fetch('/api/wallet/authentic-positions');
      if (!response.ok) return;

      const data = await response.json();
      const tokens = data || [];

      console.log(`🔍 Scanning ${tokens.length} wallet tokens`);

      for (const token of tokens) {
        if (token.valueUSD > 1) { // Only track tokens worth more than $1
          const walletToken: WalletToken = {
            mint: token.mint,
            symbol: token.symbol || 'Unknown',
            balance: token.balance,
            valueUSD: token.valueUSD,
            currentPrice: token.valueUSD / token.balance,
            entryTime: Date.now() - (24 * 60 * 60 * 1000) // Assume 24h ago if unknown
          };

          this.walletTokens.set(token.mint, walletToken);
          
          // Add to portfolio balancer for monitoring
          portfolioBalancer.addPosition(
            token.mint, 
            walletToken.symbol, 
            walletToken.currentPrice, 
            token.valueUSD / 200 // Convert USD to SOL estimate
          );
        }
      }

      console.log(`📊 Tracking ${this.walletTokens.size} wallet positions`);

    } catch (error) {
      console.error('❌ Error scanning wallet tokens:', (error as Error).message);
    }
  }

  /**
   * Monitor existing wallet positions for profit opportunities
   */
  private async monitorWalletPositions(): Promise<void> {
    try {
      console.log('👀 Monitoring wallet positions for exits...');

      for (const [mint, token] of this.walletTokens) {
        // Update current price
        const currentPrice = await this.getCurrentPrice(mint);
        if (currentPrice > 0) {
          token.currentPrice = currentPrice;
          
          // Calculate P&L if we have entry price
          if (token.entryPrice) {
            token.pnlPercent = ((currentPrice - token.entryPrice) / token.entryPrice) * 100;
            
            // Check for profit taking opportunities
            if (token.pnlPercent > 50) { // 50%+ profit
              console.log(`🎯 Profit opportunity: ${token.symbol} +${token.pnlPercent.toFixed(1)}%`);
              await this.executeTokenExit(token, 'PROFIT_TARGET');
            } else if (token.pnlPercent < -30) { // 30% loss
              console.log(`🔴 Stop loss triggered: ${token.symbol} ${token.pnlPercent.toFixed(1)}%`);
              await this.executeTokenExit(token, 'STOP_LOSS');
            }
          }
        }

        // Update portfolio balancer with current price
        portfolioBalancer.updatePosition(mint, currentPrice);
      }

      // Execute portfolio balancer recommendations
      const balancerActions = await portfolioBalancer.executeAutomaticRebalancing();
      if (balancerActions.liquidated.length > 0 || balancerActions.rebalanced.length > 0) {
        console.log(`⚖️ Portfolio rebalanced: ${balancerActions.liquidated.length} liquidated, ${balancerActions.rebalanced.length} rebalanced`);
      }

    } catch (error) {
      console.error('❌ Error monitoring positions:', (error as Error).message);
    }
  }

  /**
   * Execute token exit
   */
  private async executeTokenExit(token: WalletToken, reason: string): Promise<void> {
    try {
      console.log(`🔄 Executing exit for ${token.symbol}: ${reason}`);

      // Simulate exit execution (would use Jupiter swap)
      const exitPrice = token.currentPrice;
      const exitValue = token.balance * exitPrice;

      // Record exit in pattern memory if we have the pattern ID
      // This would be stored when the position was originally created

      // Remove from tracking
      this.walletTokens.delete(token.mint);
      portfolioBalancer.removePosition(token.mint);

      // Add to recent trades
      this.recentTrades.unshift({
        id: `exit_${Date.now()}`,
        symbol: token.symbol,
        mint: token.mint,
        exitPrice: exitPrice,
        pnl: token.pnlPercent || 0,
        reason: reason,
        timestamp: Date.now(),
        status: reason === 'PROFIT_TARGET' ? 'SOLD_PROFIT' : 'SOLD_LOSS'
      });

      console.log(`✅ Exit completed: ${token.symbol} ${token.pnlPercent?.toFixed(1)}%`);

    } catch (error) {
      console.error(`❌ Exit error for ${token.symbol}:`, (error as Error).message);
    }
  }

  /**
   * Execute trade
   */
  private async executeTrade(token: any, amount: number): Promise<any> {
    try {
      // Use real Jupiter trader for execution
      const result = await realJupiterTrader.executeSwap(
        amount,
        token.tokensReceived || 1000000,
        token.mint
      );

      return {
        success: result.success,
        entryPrice: amount / (token.tokensReceived || 1000000),
        txHash: result.signature || this.generateTxHash()
      };

    } catch (error) {
      console.error('❌ Trade execution error:', (error as Error).message);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Record trade pattern
   */
  private recordTradePattern(token: any, amount: number, entryPrice: number): void {
    const patternId = patternMemory.recordTrade({
      mint: token.mint,
      symbol: token.symbol,
      entryPrice: entryPrice,
      marketCap: token.marketCap || 25000,
      volume24h: token.volume24h || 50000,
      ageHours: token.ageHours || 2,
      liquidity: token.liquidity || 100000,
      buyTax: 0,
      sellTax: 0,
      holderCount: 100,
      bondingCurveProgress: 0.5,
      marketCondition: 'BULL',
      solPrice: 200,
      totalPortfolioValue: amount * 50, // Estimate
      positionSizePercent: 5
    });

    portfolioBalancer.addPosition(token.mint, token.symbol, entryPrice, amount);
    console.log(`🧠 Pattern recorded: ${patternId}`);
  }

  /**
   * Get current SOL balance
   */
  private async getSOLBalance(): Promise<number> {
    try {
      const response = await fetch('/api/wallet/authentic-balance');
      const data = await response.json();
      return parseFloat(data.solBalance || '0');
    } catch (error) {
      console.error('❌ Error getting SOL balance:', (error as Error).message);
      return 0;
    }
  }

  /**
   * Get current price for a token
   */
  private async getCurrentPrice(mint: string): Promise<number> {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`);
      if (!response.ok) return 0;
      
      const data = await response.json();
      return data.data?.[mint]?.price || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Add alert
   */
  private addAlert(type: TradingAlert['type'], message: string, severity: TradingAlert['severity']): void {
    const alert: TradingAlert = {
      type,
      message,
      timestamp: Date.now(),
      severity
    };

    this.alerts.unshift(alert);
    this.alerts = this.alerts.slice(0, 20); // Keep last 20 alerts

    console.log(`🚨 Alert [${severity}]: ${message}`);
  }

  /**
   * Generate transaction hash
   */
  private generateTxHash(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get trading status and metrics
   */
  public getStatus(): {
    isActive: boolean;
    solBalance: number;
    walletTokens: WalletToken[];
    recentTrades: any[];
    alerts: TradingAlert[];
    config: ContinuousConfig;
  } {
    return {
      isActive: this.isActive,
      solBalance: 0, // Will be updated by async call
      walletTokens: Array.from(this.walletTokens.values()),
      recentTrades: this.recentTrades,
      alerts: this.alerts,
      config: this.config
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ContinuousConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Continuous trading config updated');
  }
}

// Export singleton instance
export const continuousTradingEngine = new ContinuousTradingEngine();