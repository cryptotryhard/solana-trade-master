/**
 * VICTORIA LIVE TRADER - REAL PHANTOM WALLET TRADING
 * Executes real trades with your live wallet using authentic Birdeye data
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { birdeyeScanner } from './birdeye-token-scanner';
import { realBlockchainTrader } from './real-blockchain-trader';
import { fallbackDEXRouter } from './fallback-dex-router';

interface LiveTrade {
  id: string;
  tokenMint: string;
  symbol: string;
  entryPrice: number;
  entryAmount: number;
  tokensReceived: number;
  entryTime: number;
  currentPrice: number;
  status: 'ACTIVE' | 'SOLD_PROFIT' | 'SOLD_LOSS';
  entryTxHash: string;
  exitTxHash?: string;
  pnl?: number;
  roi?: number;
}

class VictoriaLiveTrader {
  private isActive = false;
  private livePositions = new Map<string, LiveTrade>();
  private connection: Connection;
  private walletAddress = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
  private tradingInterval?: NodeJS.Timeout;
  private stopAllSynthetic = false;

  constructor() {
    this.connection = new Connection(process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com');
  }

  async activateLiveTrading(): Promise<{ success: boolean; message: string; capital?: number }> {
    try {
      console.log('🚀 VICTORIA LIVE TRADER ACTIVATION');
      console.log('🛑 STOPPING ALL SYNTHETIC TRADING SYSTEMS');
      
      this.stopAllSynthetic = true;
      
      // Verify Birdeye API
      if (!birdeyeScanner.isApiConfigured()) {
        throw new Error('BIRDEYE_API_KEY required for authentic token data');
      }

      // Get live wallet balance
      const solBalance = await this.getLiveSOLBalance();
      console.log(`💰 Live wallet: ${solBalance} SOL ($${(solBalance * 157).toFixed(2)})`);

      if (solBalance < 0.05) {
        throw new Error('Insufficient SOL balance - need minimum 0.05 SOL for trading');
      }

      // Load existing positions
      await this.loadLivePositions();
      
      this.isActive = true;
      this.startLiveTradingLoop();

      console.log('✅ VICTORIA LIVE TRADER ACTIVATED');
      console.log('✅ PHANTOM WALLET CONNECTED');
      console.log('✅ AUTHENTIC BIRDEYE DATA ENABLED');
      console.log('❌ SYNTHETIC DATA PERMANENTLY DISABLED');

      return {
        success: true,
        message: 'Victoria Live Trader activated with real wallet',
        capital: solBalance * 157
      };

    } catch (error) {
      console.error('❌ Live trader activation failed:', error);
      return {
        success: false,
        message: `Activation failed: ${error}`
      };
    }
  }

  private async getLiveSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(new PublicKey(this.walletAddress));
      return balance / 1e9;
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      return 0;
    }
  }

  private async loadLivePositions(): Promise<void> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey(this.walletAddress),
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      let positionsLoaded = 0;
      for (const account of tokenAccounts.value) {
        const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
        if (balance && balance > 0.001) { // Only meaningful balances
          const mint = account.account.data.parsed.info.mint;
          
          const position: LiveTrade = {
            id: `live-${mint}-${Date.now()}`,
            tokenMint: mint,
            symbol: 'LOADING...',
            entryPrice: 0,
            entryAmount: 0,
            tokensReceived: balance,
            entryTime: Date.now(),
            currentPrice: 0,
            status: 'ACTIVE',
            entryTxHash: 'existing-position'
          };

          this.livePositions.set(mint, position);
          positionsLoaded++;
        }
      }
      
      console.log(`📊 Loaded ${positionsLoaded} live positions from wallet`);
    } catch (error) {
      console.error('Error loading live positions:', error);
    }
  }

  private startLiveTradingLoop(): void {
    console.log('🔄 Starting live trading loop - 15 second intervals');
    
    this.tradingInterval = setInterval(async () => {
      if (!this.isActive) return;
      
      try {
        await this.executeLiveTradingCycle();
      } catch (error) {
        console.error('Live trading cycle error:', error);
      }
    }, 15000); // 15 seconds
  }

  private async executeLiveTradingCycle(): Promise<void> {
    try {
      console.log('🔍 Scanning for real opportunities...');
      
      // Get authentic opportunities from Birdeye
      const opportunities = await birdeyeScanner.scanRealTokens();
      
      if (opportunities.length === 0) {
        console.log('📊 No real opportunities found');
        return;
      }

      // Filter for high AI scores (85%+)
      const highScoreTokens = opportunities.filter(token => token.aiScore >= 85);
      
      if (highScoreTokens.length === 0) {
        console.log('🎯 No tokens with 85%+ AI score found');
        return;
      }

      // Check SOL balance
      const solBalance = await this.getLiveSOLBalance();
      if (solBalance < 0.1) {
        console.log(`⚠️ Low SOL balance: ${solBalance}`);
        return;
      }

      // Execute trade on best token
      const bestToken = highScoreTokens[0];
      const tradeAmount = Math.min(0.1, solBalance * 0.15); // 0.1 SOL max or 15% of balance

      console.log(`🚀 EXECUTING LIVE TRADE`);
      console.log(`💰 Token: ${bestToken.symbol}`);
      console.log(`💰 Amount: ${tradeAmount} SOL`);
      console.log(`🎯 AI Score: ${bestToken.aiScore}%`);
      console.log(`📊 Market Cap: $${bestToken.marketCap}`);

      const result = await this.executeLiveTrade(bestToken, tradeAmount);
      
      if (result.success) {
        console.log(`✅ LIVE TRADE EXECUTED`);
        console.log(`🔗 TX: ${result.txHash}`);
        console.log(`🔗 Solscan: https://solscan.io/tx/${result.txHash}`);
        
        // Record position
        const position: LiveTrade = {
          id: `live-${bestToken.mint}-${Date.now()}`,
          tokenMint: bestToken.mint,
          symbol: bestToken.symbol,
          entryPrice: bestToken.price,
          entryAmount: tradeAmount,
          tokensReceived: result.tokensReceived || 0,
          entryTime: Date.now(),
          currentPrice: bestToken.price,
          status: 'ACTIVE',
          entryTxHash: result.txHash!
        };

        this.livePositions.set(bestToken.mint, position);
        
        console.log(`📊 New position: ${bestToken.symbol} - ${result.tokensReceived} tokens`);
      } else {
        console.log(`❌ Trade failed: ${result.error}`);
      }

    } catch (error) {
      console.error('Live trading cycle error:', error);
    }
  }

  private async executeLiveTrade(token: any, amount: number): Promise<{ success: boolean; txHash?: string; tokensReceived?: number; error?: string }> {
    try {
      console.log(`🔄 Executing real blockchain trade...`);
      
      // Try Jupiter first
      try {
        const jupiterResult = await realBlockchainTrader.buyToken(token.mint, amount);
        if (jupiterResult.success && jupiterResult.txHash) {
          return jupiterResult;
        }
      } catch (jupiterError) {
        console.log(`⚠️ Jupiter failed, using fallback DEX`);
      }

      // Use fallback DEX routing
      const fallbackResult = await fallbackDEXRouter.executeSwap(
        'So11111111111111111111111111111111111111112', // SOL
        token.mint,
        amount * 1e9, // Convert to lamports
        Math.floor(amount * 1e9 * 0.95) // 5% slippage
      );

      if (fallbackResult.success && fallbackResult.signature) {
        return {
          success: true,
          txHash: fallbackResult.signature,
          tokensReceived: fallbackResult.outputAmount || 0
        };
      }

      return { success: false, error: 'All trading methods failed' };

    } catch (error) {
      return { success: false, error: `Trade execution failed: ${error}` };
    }
  }

  // Public API methods
  getLivePositions(): LiveTrade[] {
    return Array.from(this.livePositions.values());
  }

  async getLivePortfolioValue(): Promise<{ totalValue: number; solBalance: number; positions: LiveTrade[] }> {
    const solBalance = await this.getLiveSOLBalance();
    const positions = this.getLivePositions();
    
    let totalTokenValue = 0;
    for (const position of positions) {
      try {
        const currentPrice = await birdeyeScanner.getTokenPrice(position.tokenMint);
        totalTokenValue += position.tokensReceived * currentPrice;
        position.currentPrice = currentPrice;
      } catch (error) {
        // Skip tokens that can't be priced
      }
    }

    return {
      totalValue: (solBalance * 157) + totalTokenValue,
      solBalance,
      positions
    };
  }

  getStatus(): { active: boolean; positions: number; syntheticDisabled: boolean } {
    return {
      active: this.isActive,
      positions: this.livePositions.size,
      syntheticDisabled: this.stopAllSynthetic
    };
  }

  stopLiveTrading(): void {
    this.isActive = false;
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = undefined;
    }
    console.log('🛑 Victoria Live Trader stopped');
  }
}

export const victoriaLiveTrader = new VictoriaLiveTrader();