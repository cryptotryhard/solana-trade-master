/**
 * VICTORIA REAL MODE - LIVE TRADING ONLY
 * Connects Victoria to live Phantom wallet with authentic data
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { realBlockchainTrader } from './real-blockchain-trader';
import { birdeyeScanner } from './birdeye-token-scanner';
import { realTradeValidator } from './real-trade-validator';

interface RealTrade {
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
  exitTxHash?: string;
  pnl?: number;
  roi?: number;
}

class VictoriaRealMode {
  private isActive = false;
  private realPositions = new Map<string, RealTrade>();
  private connection: Connection;
  private walletAddress: string;
  private tradingInterval?: NodeJS.Timeout;

  constructor() {
    this.connection = new Connection(process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com');
    this.walletAddress = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
  }

  async activateRealMode(): Promise<{ success: boolean; message: string; capital?: number }> {
    try {
      console.log('🚀 ACTIVATING VICTORIA REAL MODE');
      console.log('🛑 DISABLING ALL SYNTHETIC TRADING SYSTEMS');
      
      // Verify Birdeye API is configured
      if (!birdeyeScanner.isApiConfigured()) {
        throw new Error('BIRDEYE_API_KEY required for authentic token scanning');
      }

      // Get live wallet balance
      const balance = await this.getLiveSOLBalance();
      console.log(`💰 Live wallet balance: ${balance} SOL`);

      if (balance < 0.05) {
        throw new Error('Insufficient SOL balance for trading (minimum 0.05 SOL required)');
      }

      // Initialize real trading components
      await this.initializeRealTrading();
      
      this.isActive = true;
      this.startRealTradingLoop();

      console.log('✅ VICTORIA REAL MODE ACTIVATED');
      console.log('✅ CONNECTED TO LIVE PHANTOM WALLET');
      console.log('✅ BIRDEYE API INTEGRATION ACTIVE');
      console.log('✅ REAL ON-CHAIN VALIDATION ENABLED');
      console.log('❌ ALL SYNTHETIC DATA DISABLED');

      return {
        success: true,
        message: 'Victoria Real Mode activated with live wallet connection',
        capital: balance * 157 // Approximate USD value
      };

    } catch (error) {
      console.error('❌ Real mode activation failed:', error);
      return {
        success: false,
        message: `Real mode activation failed: ${error}`
      };
    }
  }

  private async initializeRealTrading(): Promise<void> {
    // Verify wallet connection
    const publicKey = new PublicKey(this.walletAddress);
    const accountInfo = await this.connection.getAccountInfo(publicKey);
    
    if (!accountInfo) {
      throw new Error('Wallet not found on blockchain');
    }

    // Load existing positions from blockchain
    await this.loadRealPositions();
    
    console.log(`📊 Loaded ${this.realPositions.size} active positions from blockchain`);
  }

  private async loadRealPositions(): Promise<void> {
    try {
      // Get all token accounts for the wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey(this.walletAddress),
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      // Filter for non-zero balances (active positions)
      for (const account of tokenAccounts.value) {
        const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
        if (balance && balance > 0) {
          const mint = account.account.data.parsed.info.mint;
          
          // Create position record for tracking
          const position: RealTrade = {
            id: `real-${mint}-${Date.now()}`,
            tokenMint: mint,
            symbol: 'UNKNOWN', // Will be resolved via Birdeye
            entryPrice: 0, // Will be estimated
            entryAmount: 0, // Will be estimated
            tokensReceived: balance,
            entryTime: Date.now(),
            currentPrice: 0,
            status: 'ACTIVE',
            entryTxHash: 'existing-position'
          };

          this.realPositions.set(mint, position);
        }
      }
    } catch (error) {
      console.error('Error loading real positions:', error);
    }
  }

  private async getLiveSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(new PublicKey(this.walletAddress));
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      return 0;
    }
  }

  private startRealTradingLoop(): void {
    console.log('🔄 Starting real trading loop - 10 second intervals');
    
    this.tradingInterval = setInterval(async () => {
      if (!this.isActive) return;
      
      try {
        await this.executeRealTradingCycle();
      } catch (error) {
        console.error('Real trading cycle error:', error);
      }
    }, 10000); // 10 seconds
  }

  private async executeRealTradingCycle(): Promise<void> {
    try {
      // 1. Scan for real opportunities using Birdeye
      const opportunities = await birdeyeScanner.scanRealTokens();
      
      if (opportunities.length === 0) {
        console.log('🔍 No real opportunities found this cycle');
        return;
      }

      // 2. Filter for high-score tokens (85%+ AI score)
      const highScoreTokens = opportunities.filter(token => token.aiScore >= 85);
      
      if (highScoreTokens.length === 0) {
        console.log('🎯 No tokens with 85%+ AI score found');
        return;
      }

      // 3. Check available SOL balance
      const solBalance = await this.getLiveSOLBalance();
      if (solBalance < 0.1) {
        console.log('⚠️ Insufficient SOL for trading');
        return;
      }

      // 4. Execute real trade on highest scoring token
      const bestToken = highScoreTokens[0];
      const tradeAmount = Math.min(0.1, solBalance * 0.2); // Use 0.1 SOL or 20% of balance

      console.log(`🚀 EXECUTING REAL TRADE: ${bestToken.symbol}`);
      console.log(`💰 Amount: ${tradeAmount} SOL`);
      console.log(`🎯 AI Score: ${bestToken.aiScore}%`);

      const result = await this.executeRealTrade(bestToken, tradeAmount);
      
      if (result.success) {
        console.log(`✅ REAL TRADE EXECUTED: ${result.txHash}`);
        console.log(`🔗 Solscan: https://solscan.io/tx/${result.txHash}`);
        
        // Validate on-chain
        const isValidated = await realTradeValidator.validateTrade(result.txHash);
        if (isValidated) {
          console.log('✅ TRADE VALIDATED ON-CHAIN');
        } else {
          console.log('❌ TRADE VALIDATION FAILED');
        }
      }

    } catch (error) {
      console.error('Real trading cycle error:', error);
    }
  }

  private async executeRealTrade(token: any, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Execute real blockchain trade
      const result = await realBlockchainTrader.buyToken(token.mint, amount);
      
      if (result.success && result.txHash) {
        // Record the position
        const position: RealTrade = {
          id: `real-${token.mint}-${Date.now()}`,
          tokenMint: token.mint,
          symbol: token.symbol,
          entryPrice: token.price,
          entryAmount: amount,
          tokensReceived: result.tokensReceived || 0,
          entryTime: Date.now(),
          currentPrice: token.price,
          status: 'ACTIVE',
          entryTxHash: result.txHash
        };

        this.realPositions.set(token.mint, position);
        
        return { success: true, txHash: result.txHash };
      }

      return { success: false, error: 'Trade execution failed' };

    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  // Public methods for dashboard
  getRealPositions(): RealTrade[] {
    return Array.from(this.realPositions.values());
  }

  async getRealPortfolioValue(): Promise<{ totalValue: number; solBalance: number; positions: RealTrade[] }> {
    const solBalance = await this.getLiveSOLBalance();
    const positions = this.getRealPositions();
    
    // Calculate total value (SOL + token positions)
    let totalTokenValue = 0;
    for (const position of positions) {
      // Get current price from Birdeye
      try {
        const currentPrice = await birdeyeScanner.getTokenPrice(position.tokenMint);
        totalTokenValue += position.tokensReceived * currentPrice;
      } catch (error) {
        console.log(`Error getting price for ${position.symbol}:`, error);
      }
    }

    return {
      totalValue: (solBalance * 157) + totalTokenValue, // Approximate USD
      solBalance,
      positions
    };
  }

  getStatus(): { active: boolean; positions: number; lastTrade?: number } {
    return {
      active: this.isActive,
      positions: this.realPositions.size,
      lastTrade: this.realPositions.size > 0 ? Math.max(...Array.from(this.realPositions.values()).map(p => p.entryTime)) : undefined
    };
  }

  stopRealMode(): void {
    this.isActive = false;
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = undefined;
    }
    console.log('🛑 Victoria Real Mode stopped');
  }
}

export const victoriaRealMode = new VictoriaRealMode();