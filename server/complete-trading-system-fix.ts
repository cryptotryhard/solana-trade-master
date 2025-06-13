/**
 * COMPLETE TRADING SYSTEM FIX
 * Celý proces od A do Z - pump.fun scanning → nákup na 15-20K MC → prodej na peaks
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';

interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  marketCap: number;
  price: number;
  volume24h: number;
  liquidity: number;
  holders: number;
  created: Date;
  isPumpFun: boolean;
  contractVerified: boolean;
}

interface TradeExecution {
  success: boolean;
  txHash?: string;
  error?: string;
  actualPrice: number;
  slippage: number;
  tokensReceived: number;
}

class CompleteTradingSystemFix {
  private connection: Connection;
  private walletKeypair: any;
  private activeTrades: Map<string, any> = new Map();
  
  // Targeting parametry dle požadavků
  private readonly TARGET_MC_MIN = 15000; // 15K USD
  private readonly TARGET_MC_MAX = 20000; // 20K USD
  private readonly MIN_PROFIT_TARGET = 1000; // 1000% = 10x
  private readonly MAX_PROFIT_TARGET = 100000; // 100000% = 1000x
  private readonly POSITION_SIZE = 0.1; // 0.1 SOL per trade

  constructor() {
    this.connection = new Connection(process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=' + process.env.HELIUS_API_KEY);
    
    if (process.env.WALLET_PRIVATE_KEY) {
      const privateKeyBytes = bs58.decode(process.env.WALLET_PRIVATE_KEY);
      this.walletKeypair = {
        publicKey: new PublicKey('9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d'),
        secretKey: privateKeyBytes
      };
    }
  }

  /**
   * KROK 1: SCAN PUMP.FUN PRO NOVÉ TOKENY S MC 15-20K
   */
  async scanPumpFunForTargets(): Promise<PumpFunToken[]> {
    try {
      console.log('🔍 Scanning pump.fun for MC 15-20K targets...');
      
      // Pump.fun API call pro nové launches
      const response = await fetch('https://frontend-api.pump.fun/coins/sort/new?includeNsfw=false&limit=50', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Pump.fun API error: ${response.status}`);
      }

      const data = await response.json();
      const validTargets: PumpFunToken[] = [];

      for (const coin of data) {
        // Přesný MC check na 15-20K USD
        const marketCap = coin.usd_market_cap || 0;
        
        if (marketCap >= this.TARGET_MC_MIN && marketCap <= this.TARGET_MC_MAX) {
          const token: PumpFunToken = {
            mint: coin.mint,
            name: coin.name,
            symbol: coin.symbol,
            marketCap: marketCap,
            price: coin.price_usd || 0,
            volume24h: coin.volume_24h || 0,
            liquidity: coin.liquidity || 0,
            holders: coin.holder_count || 0,
            created: new Date(coin.created_timestamp),
            isPumpFun: true,
            contractVerified: true
          };
          
          validTargets.push(token);
          console.log(`🎯 Target found: ${token.symbol} - MC: $${marketCap.toLocaleString()}`);
        }
      }

      console.log(`✅ Found ${validTargets.length} valid pump.fun targets`);
      return validTargets;
      
    } catch (error) {
      console.error('❌ Error scanning pump.fun:', error);
      return [];
    }
  }

  /**
   * KROK 2: EXECUTE BUY ORDER PRO PUMP.FUN TOKEN
   */
  async executePumpFunBuy(token: PumpFunToken): Promise<TradeExecution> {
    try {
      console.log(`⚡ Executing pump.fun buy: ${token.symbol} at MC $${token.marketCap.toLocaleString()}`);

      // Jupiter API pro swap SOL → Token
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${token.mint}&amount=${this.POSITION_SIZE * LAMPORTS_PER_SOL}&slippageBps=500`
      );

      if (!quoteResponse.ok) {
        throw new Error('Failed to get Jupiter quote');
      }

      const quoteData = await quoteResponse.json();
      
      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.walletKeypair.publicKey.toString(),
          wrapAndUnwrapSol: true,
          feeAccount: null
        })
      });

      const swapData = await swapResponse.json();
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = Transaction.from(swapTransactionBuf);

      // Sign and send transaction
      transaction.partialSign(this.walletKeypair);
      const txHash = await this.connection.sendRawTransaction(transaction.serialize());
      
      // Confirm transaction
      await this.connection.confirmTransaction(txHash, 'confirmed');
      
      const tokensReceived = parseInt(quoteData.outAmount);
      const actualPrice = this.POSITION_SIZE / (tokensReceived / Math.pow(10, 6)); // Assuming 6 decimals
      const slippage = Math.abs((actualPrice - token.price) / token.price) * 100;

      // Record active trade
      this.activeTrades.set(token.mint, {
        symbol: token.symbol,
        entryPrice: actualPrice,
        entryMC: token.marketCap,
        tokensHeld: tokensReceived,
        solInvested: this.POSITION_SIZE,
        entryTime: new Date(),
        targetProfit: this.MIN_PROFIT_TARGET // 1000% minimum
      });

      console.log(`✅ Buy executed: ${token.symbol}`);
      console.log(`   TX: ${txHash}`);
      console.log(`   Tokens: ${tokensReceived.toLocaleString()}`);
      console.log(`   Price: $${actualPrice.toFixed(8)}`);

      return {
        success: true,
        txHash,
        actualPrice,
        slippage,
        tokensReceived
      };

    } catch (error) {
      console.error(`❌ Error buying ${token.symbol}:`, error);
      return {
        success: false,
        error: error.message,
        actualPrice: 0,
        slippage: 0,
        tokensReceived: 0
      };
    }
  }

  /**
   * KROK 3: MONITOR POSITIONS PRO PROFIT TAKING
   */
  async monitorPositionsForProfits(): Promise<void> {
    try {
      console.log(`📊 Monitoring ${this.activeTrades.size} active positions...`);

      for (const [mint, trade] of this.activeTrades) {
        // Get current price from Jupiter
        const quoteResponse = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${mint}&outputMint=So11111111111111111111111111111111111111112&amount=${trade.tokensHeld}&slippageBps=500`
        );

        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json();
          const currentSOLValue = parseInt(quoteData.outAmount) / LAMPORTS_PER_SOL;
          const currentROI = ((currentSOLValue / trade.solInvested) - 1) * 100;

          console.log(`📈 ${trade.symbol}: ${currentROI.toFixed(2)}% ROI`);

          // Check profit targets (1000% - 100000%)
          if (currentROI >= this.MIN_PROFIT_TARGET) {
            console.log(`🚀 PROFIT TARGET HIT: ${trade.symbol} at ${currentROI.toFixed(2)}%`);
            await this.executeProfitSale(mint, trade, currentSOLValue);
          }
        }

        // Small delay between checks
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error('❌ Error monitoring positions:', error);
    }
  }

  /**
   * KROK 4: EXECUTE PROFIT SALE
   */
  async executeProfitSale(mint: string, trade: any, currentSOLValue: number): Promise<void> {
    try {
      console.log(`💰 Executing profit sale: ${trade.symbol}`);

      // Jupiter swap Token → SOL
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${mint}&outputMint=So11111111111111111111111111111111111111112&amount=${trade.tokensHeld}&slippageBps=500`
      );

      const quoteData = await quoteResponse.json();
      
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.walletKeypair.publicKey.toString(),
          wrapAndUnwrapSol: true
        })
      });

      const swapData = await swapResponse.json();
      const transaction = Transaction.from(Buffer.from(swapData.swapTransaction, 'base64'));
      
      transaction.partialSign(this.walletKeypair);
      const txHash = await this.connection.sendRawTransaction(transaction.serialize());
      await this.connection.confirmTransaction(txHash, 'confirmed');

      const finalROI = ((currentSOLValue / trade.solInvested) - 1) * 100;
      const profit = currentSOLValue - trade.solInvested;

      console.log(`✅ PROFIT SALE COMPLETE: ${trade.symbol}`);
      console.log(`   Final ROI: ${finalROI.toFixed(2)}%`);
      console.log(`   Profit: ${profit.toFixed(4)} SOL`);
      console.log(`   TX: ${txHash}`);

      // Remove from active trades
      this.activeTrades.delete(mint);

    } catch (error) {
      console.error(`❌ Error selling ${trade.symbol}:`, error);
    }
  }

  /**
   * KROK 5: GET TOTAL WALLET VALUE (PHANTOM WALLET CELKOVÁ HODNOTA)
   */
  async getTotalWalletValue(): Promise<{solBalance: number, totalValue: number, tokenCount: number}> {
    try {
      // SOL balance
      const solBalance = await this.connection.getBalance(this.walletKeypair.publicKey) / LAMPORTS_PER_SOL;
      
      // Get all token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.walletKeypair.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      let totalTokenValue = 0;
      let tokenCount = 0;

      for (const account of tokenAccounts.value) {
        const accountInfo = account.account.data.parsed.info;
        const mint = accountInfo.mint;
        const amount = accountInfo.tokenAmount.uiAmount;

        if (amount > 0) {
          tokenCount++;
          
          // Try to get token value via Jupiter price API
          try {
            const priceResponse = await fetch(
              `https://quote-api.jup.ag/v6/quote?inputMint=${mint}&outputMint=So11111111111111111111111111111111111111112&amount=${accountInfo.tokenAmount.amount}&slippageBps=500`
            );
            
            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              const solValue = parseInt(priceData.outAmount) / LAMPORTS_PER_SOL;
              totalTokenValue += solValue;
            }
          } catch (priceError) {
            // Token price unavailable, count as 0
          }
        }
      }

      const totalValue = solBalance + totalTokenValue;

      return {
        solBalance,
        totalValue,
        tokenCount
      };

    } catch (error) {
      console.error('❌ Error getting wallet value:', error);
      return { solBalance: 0, totalValue: 0, tokenCount: 0 };
    }
  }

  /**
   * MAIN TRADING CYCLE
   */
  async startCompleteTradingCycle(): Promise<void> {
    console.log('🚀 Starting complete pump.fun trading cycle...');
    console.log(`🎯 Target MC: $${this.TARGET_MC_MIN.toLocaleString()} - $${this.TARGET_MC_MAX.toLocaleString()}`);
    console.log(`💰 Profit targets: ${this.MIN_PROFIT_TARGET}% - ${this.MAX_PROFIT_TARGET}%`);

    setInterval(async () => {
      try {
        // Monitor existing positions first
        await this.monitorPositionsForProfits();

        // Look for new opportunities if we have available SOL
        const walletValue = await this.getTotalWalletValue();
        
        if (walletValue.solBalance >= this.POSITION_SIZE && this.activeTrades.size < 5) {
          const targets = await this.scanPumpFunForTargets();
          
          if (targets.length > 0) {
            // Execute buy on best target
            const bestTarget = targets[0]; // First valid target
            await this.executePumpFunBuy(bestTarget);
          }
        }

      } catch (error) {
        console.error('❌ Trading cycle error:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  // Public method to get current trading status
  getStatus() {
    return {
      activeTrades: Array.from(this.activeTrades.values()),
      tradeCount: this.activeTrades.size,
      targetMC: { min: this.TARGET_MC_MIN, max: this.TARGET_MC_MAX },
      profitTargets: { min: this.MIN_PROFIT_TARGET, max: this.MAX_PROFIT_TARGET }
    };
  }
}

export const completeTradingSystem = new CompleteTradingSystemFix();