/**
 * PUMP.FUN SPECIALIZED TRADER
 * Focused on new token launches that can reach 100M+ USD market cap
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

interface PumpFunToken {
  mint: string;
  symbol: string;
  name: string;
  marketCap: number;
  volume24h: number;
  createdAt: Date;
  bondingCurveProgress: number; // 0-100%
  isGraduated: boolean;
  liquiditySOL: number;
  holderCount: number;
  price: number;
}

interface TradingStrategy {
  entryMarketCap: number;
  targetMarketCap: number;
  maxPositionSOL: number;
  stopLossPercent: number;
  takeProfitPercent: number;
}

class PumpFunTrader {
  private connection: Connection;
  private wallet: Keypair;
  private strategy: TradingStrategy;
  private activePositions: Map<string, any> = new Map();
  private isActive: boolean = false;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
    this.wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY!));
    
    // Strategy: Buy at 20K MC, sell at 20M MC (1000x potential)
    this.strategy = {
      entryMarketCap: 20000,      // $20K entry point
      targetMarketCap: 20000000,  // $20M target (1000x)
      maxPositionSOL: 0.1,        // Max 0.1 SOL per position
      stopLossPercent: -50,       // 50% stop loss
      takeProfitPercent: 10000    // 100x take profit (10,000%)
    };
    
    // Auto-start the trader
    this.start();
  }

  public start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('🚀 PUMP.FUN TRADER ACTIVATED - READY FOR MEMECOIN HUNTING');
    console.log(`💰 Strategy: ${this.strategy.entryMarketCap/1000}K → ${this.strategy.targetMarketCap/1000000}M MC`);
    console.log('🎯 Targeting 1000x gains on new pump.fun launches');
    
    // Start continuous scanning and trading
    this.continuousTrading();
  }

  public stop(): void {
    this.isActive = false;
    console.log('⏹️ PUMP.FUN TRADER STOPPED');
  }

  private async continuousTrading(): Promise<void> {
    while (this.isActive) {
      try {
        // 1. Scan for new pump.fun launches
        const newTokens = await this.scanPumpFunLaunches();
        
        // 2. Analyze and filter high-potential tokens
        const opportunities = await this.filterHighPotentialTokens(newTokens);
        
        // 3. Execute trades on best opportunities
        for (const token of opportunities.slice(0, 3)) { // Max 3 simultaneous positions
          await this.executeTradeEntry(token);
        }
        
        // 4. Monitor and exit existing positions
        await this.monitorPositions();
        
        // Wait 30 seconds before next cycle
        await new Promise(resolve => setTimeout(resolve, 30000));
        
      } catch (error) {
        console.error('❌ Trading cycle error:', error);
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute on error
      }
    }
  }

  private async scanPumpFunLaunches(): Promise<PumpFunToken[]> {
    try {
      // Scan pump.fun for new token launches
      const response = await fetch('https://frontend-api.pump.fun/coins?offset=0&limit=50&sort=created_timestamp&order=DESC');
      
      if (!response.ok) {
        throw new Error(`Pump.fun API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data.map((coin: any) => ({
        mint: coin.mint,
        symbol: coin.symbol,
        name: coin.name,
        marketCap: coin.market_cap || 0,
        volume24h: coin.volume_24h || 0,
        createdAt: new Date(coin.created_timestamp),
        bondingCurveProgress: coin.bonding_curve_percentage || 0,
        isGraduated: coin.raydium_pool !== null,
        liquiditySOL: coin.virtual_sol_reserves || 0,
        holderCount: coin.holder_count || 0,
        price: coin.price_native || 0
      }));
      
    } catch (error) {
      console.error('❌ Error scanning pump.fun:', error);
      return [];
    }
  }

  private async filterHighPotentialTokens(tokens: PumpFunToken[]): Promise<PumpFunToken[]> {
    const filtered = tokens.filter(token => {
      // Only trade tokens that meet our criteria
      const meetsMarketCap = token.marketCap >= 15000 && token.marketCap <= 50000; // 15K-50K MC
      const hasVolume = token.volume24h > 5000; // Minimum $5K daily volume
      const isRecent = (Date.now() - token.createdAt.getTime()) < 3600000; // Max 1 hour old
      const notGraduated = !token.isGraduated; // Still on bonding curve
      const hasLiquidity = token.liquiditySOL > 5; // Minimum 5 SOL liquidity
      const hasHolders = token.holderCount > 20; // Minimum 20 holders
      
      return meetsMarketCap && hasVolume && isRecent && notGraduated && hasLiquidity && hasHolders;
    });

    // Sort by potential (volume + holder growth rate)
    return filtered.sort((a, b) => {
      const scoreA = a.volume24h * a.holderCount;
      const scoreB = b.volume24h * b.holderCount;
      return scoreB - scoreA;
    });
  }

  private async executeTradeEntry(token: PumpFunToken): Promise<void> {
    try {
      // Skip if already have position in this token
      if (this.activePositions.has(token.mint)) {
        return;
      }

      console.log(`🎯 EXECUTING ENTRY: ${token.symbol} (MC: $${token.marketCap.toLocaleString()})`);
      
      // Check SOL balance
      const solBalance = await this.connection.getBalance(this.wallet.publicKey);
      const solBalanceFloat = solBalance / 1e9;
      
      if (solBalanceFloat < this.strategy.maxPositionSOL) {
        console.log(`⚠️ Insufficient SOL for ${token.symbol}: ${solBalanceFloat} SOL`);
        return;
      }

      // Calculate position size based on confidence
      const positionSOL = Math.min(this.strategy.maxPositionSOL, solBalanceFloat * 0.2); // Max 20% of balance per trade
      
      // Execute buy via Jupiter
      const buyResult = await this.executePumpFunBuy(token, positionSOL);
      
      if (buyResult.success) {
        // Record position
        this.activePositions.set(token.mint, {
          token,
          entryPrice: token.price,
          entryTime: new Date(),
          positionSOL,
          entryMarketCap: token.marketCap,
          txHash: buyResult.txHash
        });
        
        console.log(`✅ ENTERED ${token.symbol}: ${positionSOL} SOL → ${buyResult.tokensReceived} tokens`);
        console.log(`🔗 TX: ${buyResult.txHash}`);
      }
      
    } catch (error) {
      console.error(`❌ Error entering ${token.symbol}:`, error);
    }
  }

  private async executePumpFunBuy(token: PumpFunToken, solAmount: number): Promise<any> {
    try {
      // Get Jupiter quote for SOL → token
      const quote = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${token.mint}&amount=${Math.floor(solAmount * 1e9)}&slippageBps=500`);
      
      if (!quote.ok) {
        throw new Error('Jupiter quote failed');
      }
      
      const quoteData = await quote.json();
      
      // Get swap transaction
      const swap = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        })
      });
      
      if (!swap.ok) {
        throw new Error('Jupiter swap failed');
      }
      
      const { swapTransaction } = await swap.json();
      
      // Execute transaction
      const tx = Buffer.from(swapTransaction, 'base64');
      const signature = await this.connection.sendRawTransaction(tx, {
        skipPreflight: false,
        maxRetries: 3
      });
      
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return {
        success: true,
        txHash: signature,
        tokensReceived: Number(quoteData.outAmount)
      };
      
    } catch (error) {
      console.error('❌ Buy execution failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async monitorPositions(): Promise<void> {
    for (const [mint, position] of this.activePositions.entries()) {
      try {
        // Get current token data
        const currentData = await this.getCurrentTokenData(mint);
        
        if (!currentData) {
          console.log(`⚠️ No data for ${position.token.symbol}, holding position`);
          continue;
        }
        
        const currentPnL = ((currentData.price - position.entryPrice) / position.entryPrice) * 100;
        const currentMarketCap = currentData.marketCap;
        
        console.log(`📊 ${position.token.symbol}: ${currentPnL.toFixed(2)}% PnL (MC: $${currentMarketCap.toLocaleString()})`);
        
        // Check exit conditions
        let shouldExit = false;
        let exitReason = '';
        
        // Take profit at target MC (20M)
        if (currentMarketCap >= this.strategy.targetMarketCap) {
          shouldExit = true;
          exitReason = `TARGET MC REACHED: $${currentMarketCap.toLocaleString()}`;
        }
        
        // Take profit at 1000% gain
        if (currentPnL >= 1000) {
          shouldExit = true;
          exitReason = `1000% PROFIT REACHED: ${currentPnL.toFixed(2)}%`;
        }
        
        // Stop loss at -50%
        if (currentPnL <= this.strategy.stopLossPercent) {
          shouldExit = true;
          exitReason = `STOP LOSS: ${currentPnL.toFixed(2)}%`;
        }
        
        // Exit if token graduated to Raydium (usually means pump phase over)
        if (currentData.isGraduated) {
          shouldExit = true;
          exitReason = 'TOKEN GRADUATED TO RAYDIUM';
        }
        
        if (shouldExit) {
          await this.executeTradeExit(mint, exitReason);
        }
        
      } catch (error) {
        console.error(`❌ Error monitoring ${position.token.symbol}:`, error);
      }
    }
  }

  private async getCurrentTokenData(mint: string): Promise<PumpFunToken | null> {
    try {
      const response = await fetch(`https://frontend-api.pump.fun/coins/${mint}`);
      
      if (!response.ok) {
        return null;
      }
      
      const coin = await response.json();
      
      return {
        mint: coin.mint,
        symbol: coin.symbol,
        name: coin.name,
        marketCap: coin.market_cap || 0,
        volume24h: coin.volume_24h || 0,
        createdAt: new Date(coin.created_timestamp),
        bondingCurveProgress: coin.bonding_curve_percentage || 0,
        isGraduated: coin.raydium_pool !== null,
        liquiditySOL: coin.virtual_sol_reserves || 0,
        holderCount: coin.holder_count || 0,
        price: coin.price_native || 0
      };
      
    } catch (error) {
      console.error(`❌ Error getting token data for ${mint}:`, error);
      return null;
    }
  }

  private async executeTradeExit(mint: string, reason: string): Promise<void> {
    try {
      const position = this.activePositions.get(mint);
      if (!position) return;
      
      console.log(`🚪 EXITING ${position.token.symbol}: ${reason}`);
      
      // Get token balance
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        this.wallet.publicKey,
        { mint: new PublicKey(mint) }
      );
      
      if (tokenAccounts.value.length === 0) {
        console.log(`❌ No token account found for ${position.token.symbol}`);
        this.activePositions.delete(mint);
        return;
      }
      
      // Execute sell via Jupiter
      const sellResult = await this.executePumpFunSell(mint);
      
      if (sellResult.success) {
        console.log(`✅ EXITED ${position.token.symbol}: ${sellResult.solReceived} SOL received`);
        console.log(`🔗 TX: ${sellResult.txHash}`);
        
        // Calculate final PnL
        const finalPnL = ((sellResult.solReceived - position.positionSOL) / position.positionSOL) * 100;
        console.log(`💰 FINAL PnL: ${finalPnL.toFixed(2)}% (${sellResult.solReceived - position.positionSOL} SOL)`);
        
        this.activePositions.delete(mint);
      }
      
    } catch (error) {
      console.error(`❌ Exit error for ${mint}:`, error);
    }
  }

  private async executePumpFunSell(mint: string): Promise<any> {
    try {
      // Get token balance first
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        this.wallet.publicKey,
        { mint: new PublicKey(mint) }
      );
      
      if (tokenAccounts.value.length === 0) {
        throw new Error('No token account found');
      }
      
      const tokenAccount = tokenAccounts.value[0];
      const balance = await this.connection.getTokenAccountBalance(tokenAccount.pubkey);
      const tokenAmount = balance.value.amount;
      
      // Get Jupiter quote for token → SOL
      const quote = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${mint}&outputMint=So11111111111111111111111111111111111111112&amount=${tokenAmount}&slippageBps=500`);
      
      if (!quote.ok) {
        throw new Error('Jupiter quote failed');
      }
      
      const quoteData = await quote.json();
      
      // Get swap transaction
      const swap = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        })
      });
      
      if (!swap.ok) {
        throw new Error('Jupiter swap failed');
      }
      
      const { swapTransaction } = await swap.json();
      
      // Execute transaction
      const tx = Buffer.from(swapTransaction, 'base64');
      const signature = await this.connection.sendRawTransaction(tx, {
        skipPreflight: false,
        maxRetries: 3
      });
      
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return {
        success: true,
        txHash: signature,
        solReceived: Number(quoteData.outAmount) / 1e9
      };
      
    } catch (error) {
      console.error('❌ Sell execution failed:', error);
      return { success: false, error: error.message };
    }
  }

  public getStatus() {
    return {
      isActive: this.isActive,
      activePositions: this.activePositions.size,
      strategy: this.strategy,
      positions: Array.from(this.activePositions.values())
    };
  }

  public async forceExitAll(): Promise<void> {
    console.log('🚨 FORCE EXITING ALL PUMP.FUN POSITIONS');
    
    for (const [mint, position] of this.activePositions.entries()) {
      await this.executeTradeExit(mint, 'FORCE EXIT REQUESTED');
    }
  }
}

export const pumpFunTrader = new PumpFunTrader();