/**
 * REAL TRADING CORE - Victoria's Authentic Trading System
 * Only executes trades with real on-chain confirmations
 */

import { Connection, Keypair } from '@solana/web3.js';
import { realTradeValidator } from './real-trade-validator';
import { birdeyeScanner } from './birdeye-token-scanner';
import { fallbackDexRouter } from './fallback-dex-router';

interface RealPosition {
  mint: string;
  symbol: string;
  entryTxHash: string;
  entryPrice: number;
  entryAmount: number;
  tokensReceived: number;
  entryTime: number;
  status: 'ACTIVE' | 'SOLD_PROFIT' | 'SOLD_LOSS';
  targetProfit: number;
  stopLoss: number;
  confirmedOnChain: boolean;
}

export class RealTradingCore {
  private wallet: Keypair;
  private connection: Connection;
  private positions: Map<string, RealPosition> = new Map();
  private totalCapital: number = 463;
  private tradingActive: boolean = true;

  constructor() {
    // Initialize wallet from environment
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('WALLET_PRIVATE_KEY required for real trading');
    }
    
    this.wallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(privateKey))
    );
    
    this.connection = new Connection(
      process.env.QUICKNODE_RPC_URL || 
      'https://mainnet.helius-rpc.com/?api-key=80a5abeb-622a-4fdf-905a-ac5b5842a167'
    );
  }

  async startRealTrading(): Promise<void> {
    console.log('🚀 STARTING REAL TRADING CORE');
    console.log(`💰 Initial Capital: $${this.totalCapital}`);
    console.log(`📍 Wallet: ${this.wallet.publicKey.toString()}`);
    
    if (!birdeyeScanner.isApiConfigured()) {
      console.log('❌ BIRDEYE_API_KEY required for authentic token scanning');
      return;
    }

    // Start continuous trading cycles
    this.autonomousTradingLoop();
    this.positionMonitoringLoop();
  }

  private async autonomousTradingLoop(): Promise<void> {
    while (this.tradingActive) {
      try {
        console.log('🔍 SCANNING REAL BIRDEYE DATA...');
        
        // Get authentic tokens from Birdeye API
        const realTokens = await birdeyeScanner.scanRealPumpFunTokens(200000, 75);
        
        if (realTokens.length === 0) {
          console.log('❌ No authentic tokens found, waiting 30s...');
          await this.delay(30000);
          continue;
        }

        // Select best opportunity based on AI scoring
        const bestToken = this.selectBestToken(realTokens);
        
        if (bestToken && this.shouldExecuteTrade(bestToken)) {
          await this.executeRealTrade(bestToken);
        }

        // Wait 10 seconds between scans for real-time execution
        await this.delay(10000);

      } catch (error) {
        console.log(`❌ Trading loop error: ${error}`);
        await this.delay(30000);
      }
    }
  }

  private async positionMonitoringLoop(): Promise<void> {
    while (this.tradingActive) {
      try {
        for (const [mint, position] of this.positions) {
          if (position.status === 'ACTIVE') {
            await this.updatePositionStatus(position);
          }
        }
        
        // Monitor every 5 seconds
        await this.delay(5000);

      } catch (error) {
        console.log(`❌ Position monitoring error: ${error}`);
        await this.delay(10000);
      }
    }
  }

  private selectBestToken(tokens: any[]): any {
    // Filter by strict criteria
    const filtered = tokens.filter(token => 
      token.aiScore >= 80 &&
      token.mc < 150000 &&
      token.ageMinutes < 180 &&
      token.liquidity > token.mc * 0.05
    );

    if (filtered.length === 0) return null;

    // Sort by combined score
    return filtered.sort((a, b) => {
      const scoreA = a.aiScore * 0.4 + a.velocityScore * 0.3 + (a.ageMinutes < 60 ? 20 : 0);
      const scoreB = b.aiScore * 0.4 + b.velocityScore * 0.3 + (b.ageMinutes < 60 ? 20 : 0);
      return scoreB - scoreA;
    })[0];
  }

  private shouldExecuteTrade(token: any): boolean {
    // Check if we have sufficient capital
    const positionSize = this.totalCapital * 0.2; // 20% position size
    const minPositionSize = 50; // $50 minimum

    if (positionSize < minPositionSize) {
      return false;
    }

    // Don't trade if too many active positions
    const activePositions = Array.from(this.positions.values())
      .filter(p => p.status === 'ACTIVE').length;
    
    return activePositions < 5;
  }

  private async executeRealTrade(token: any): Promise<void> {
    try {
      const solAmount = (this.totalCapital * 0.2) / 150; // 20% position, assume $150 SOL
      
      console.log(`🚀 EXECUTING REAL TRADE: ${token.symbol}`);
      console.log(`💰 Amount: ${solAmount.toFixed(4)} SOL ($${(solAmount * 150).toFixed(2)})`);
      console.log(`📊 AI Score: ${token.aiScore}% | MC: $${(token.mc/1000).toFixed(1)}k`);

      // Execute buy with real on-chain validation
      const buyResult = await realTradeValidator.executeBuyWithValidation(
        token.address,
        solAmount
      );

      if (!buyResult || !buyResult.confirmed) {
        console.log(`❌ Trade execution failed - no on-chain confirmation`);
        return;
      }

      // Create position only after confirmed on-chain
      const position: RealPosition = {
        mint: token.address,
        symbol: token.symbol,
        entryTxHash: buyResult.txHash,
        entryPrice: token.price,
        entryAmount: solAmount,
        tokensReceived: buyResult.tokensReceived || 0,
        entryTime: Date.now(),
        status: 'ACTIVE',
        targetProfit: token.price * 2.5, // 2.5x target
        stopLoss: token.price * 0.85, // 15% stop loss
        confirmedOnChain: true
      };

      this.positions.set(token.address, position);

      console.log(`✅ REAL TRADE CONFIRMED: ${token.symbol}`);
      console.log(`🔗 TX Hash: ${buyResult.txHash}`);
      console.log(`📈 Entry: $${token.price.toFixed(8)} | Target: $${position.targetProfit.toFixed(8)}`);
      
    } catch (error) {
      console.log(`❌ Real trade execution failed: ${error}`);
    }
  }

  private async updatePositionStatus(position: RealPosition): Promise<void> {
    try {
      // Get current price from Birdeye
      const tokenDetails = await birdeyeScanner.getTokenDetails(position.mint);
      
      if (!tokenDetails) {
        return;
      }

      const currentPrice = tokenDetails.price;
      const priceChange = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

      // Check exit conditions
      if (currentPrice >= position.targetProfit) {
        await this.executeExit(position, 'PROFIT', currentPrice);
      } else if (currentPrice <= position.stopLoss) {
        await this.executeExit(position, 'STOP_LOSS', currentPrice);
      }

    } catch (error) {
      console.log(`❌ Position update error: ${error}`);
    }
  }

  private async executeExit(position: RealPosition, reason: string, currentPrice: number): Promise<void> {
    try {
      console.log(`💰 EXITING POSITION: ${position.symbol} - ${reason}`);
      
      // Execute sell with real on-chain validation
      const sellResult = await realTradeValidator.executeSellWithValidation(
        position.mint,
        position.tokensReceived
      );

      if (!sellResult || !sellResult.confirmed) {
        console.log(`❌ Exit failed - no on-chain confirmation`);
        return;
      }

      // Calculate real P&L from confirmed transactions
      const realPnL = realTradeValidator.calculateRealPnL(
        realTradeValidator.getConfirmedTrades().find(t => t.txHash === position.entryTxHash)!,
        sellResult
      );

      position.status = reason === 'PROFIT' ? 'SOLD_PROFIT' : 'SOLD_LOSS';

      console.log(`✅ EXIT CONFIRMED: ${position.symbol}`);
      console.log(`🔗 Exit TX: ${sellResult.txHash}`);
      console.log(`💰 Real P&L: ${realPnL.toFixed(2)}%`);

      // Update total capital with real results
      this.totalCapital += (sellResult.solReceived || 0) * 150; // Convert SOL to USD

    } catch (error) {
      console.log(`❌ Exit execution failed: ${error}`);
    }
  }

  getPositions(): RealPosition[] {
    return Array.from(this.positions.values());
  }

  getActivePositions(): RealPosition[] {
    return this.getPositions().filter(p => p.status === 'ACTIVE');
  }

  getTotalCapital(): number {
    return this.totalCapital;
  }

  getConfirmedTrades(): any[] {
    return realTradeValidator.getConfirmedTrades();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stopTrading(): void {
    this.tradingActive = false;
    console.log('🛑 Real trading stopped');
  }
}

export const realTradingCore = new RealTradingCore();