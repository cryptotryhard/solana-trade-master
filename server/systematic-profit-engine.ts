/**
 * SYSTEMATIC PROFIT ENGINE
 * Systematická optimalizace pro 9/10 úspěšných obchodů a exponenciální růst
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { phantomLiveTrader } from './phantom-live-trader';

interface TokenBalance {
  mint: string;
  symbol: string;
  balance: number;
  decimals: number;
  uiAmount: number;
}

interface ProfitPosition {
  mint: string;
  symbol: string;
  currentBalance: number;
  currentPrice: number;
  estimatedValue: number;
  expectedSOL: number;
  shouldSell: boolean;
  sellPriority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
}

class SystematicProfitEngine {
  private connection: Connection;
  private walletPubkey: PublicKey;
  private minSOLForTrading = 0.05; // Minimum SOL needed for operations
  private profitExtractionActive = false;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
    const pubkeyString = process.env.PHANTOM_PUBKEY || '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
    this.walletPubkey = new PublicKey(pubkeyString);
  }

  async checkSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.walletPubkey);
      return balance / 1e9;
    } catch (error) {
      console.error('❌ Error checking SOL balance:', error);
      return 0;
    }
  }

  async getAllTokenBalances(): Promise<TokenBalance[]> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.walletPubkey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const balances: TokenBalance[] = [];

      for (const account of tokenAccounts.value) {
        const tokenInfo = account.account.data.parsed.info;
        const balance = parseFloat(tokenInfo.tokenAmount.amount);
        const decimals = tokenInfo.tokenAmount.decimals;
        const uiAmount = parseFloat(tokenInfo.tokenAmount.uiAmount || '0');

        if (uiAmount > 0) {
          balances.push({
            mint: tokenInfo.mint,
            symbol: await this.getTokenSymbol(tokenInfo.mint),
            balance,
            decimals,
            uiAmount
          });
        }
      }

      return balances;
    } catch (error) {
      console.error('❌ Error getting token balances:', error);
      return [];
    }
  }

  async analyzeProfitPositions(): Promise<ProfitPosition[]> {
    console.log('🔍 ANALYZING ALL TOKEN POSITIONS FOR PROFIT EXTRACTION');
    
    const tokenBalances = await this.getAllTokenBalances();
    const profitPositions: ProfitPosition[] = [];

    console.log(`💰 Found ${tokenBalances.length} token positions in wallet`);

    for (const token of tokenBalances) {
      if (token.uiAmount > 0) {
        console.log(`📊 Analyzing ${token.symbol}: ${token.uiAmount.toFixed(2)} tokens`);
        
        const currentPrice = await this.getTokenPrice(token.mint);
        const estimatedValue = token.uiAmount * currentPrice;
        const expectedSOL = await this.estimateSOLFromSale(token.mint, token.balance, token.decimals);

        console.log(`   💵 Current price: $${currentPrice.toFixed(8)}`);
        console.log(`   🎯 Estimated value: $${estimatedValue.toFixed(4)}`);
        console.log(`   ⚡ Expected SOL: ${expectedSOL.toFixed(6)}`);

        if (expectedSOL > 0.001) { // Pouze pokud lze získat alespoň 0.001 SOL
          let sellPriority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
          let shouldSell = false;

          // Určení priority na základě potenciálního výnosu
          if (expectedSOL > 0.1) {
            sellPriority = 'URGENT';
            shouldSell = true;
          } else if (expectedSOL > 0.05) {
            sellPriority = 'HIGH';
            shouldSell = true;
          } else if (expectedSOL > 0.02) {
            sellPriority = 'MEDIUM';
            shouldSell = true;
          } else if (expectedSOL > 0.005) {
            sellPriority = 'LOW';
            shouldSell = true;
          }

          profitPositions.push({
            mint: token.mint,
            symbol: token.symbol,
            currentBalance: token.balance,
            currentPrice,
            estimatedValue,
            expectedSOL,
            shouldSell,
            sellPriority
          });
        }
      }
    }

    return profitPositions.sort((a, b) => {
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.sellPriority] - priorityOrder[a.sellPriority];
    });
  }

  async executeSystematicProfitExtraction(): Promise<number> {
    if (this.profitExtractionActive) {
      console.log('⚠️ Profit extraction already in progress');
      return 0;
    }

    this.profitExtractionActive = true;
    
    try {
      console.log('🚀 EXECUTING SYSTEMATIC PROFIT EXTRACTION');
      
      const currentSOL = await this.checkSOLBalance();
      console.log(`💰 Current SOL balance: ${currentSOL.toFixed(6)}`);

      if (currentSOL >= this.minSOLForTrading) {
        console.log('✅ Sufficient SOL balance for trading');
        return 0;
      }

      const profitPositions = await this.analyzeProfitPositions();
      
      if (profitPositions.length === 0) {
        console.log('⚠️ No profitable positions found to extract');
        return 0;
      }

      console.log(`💎 Found ${profitPositions.length} positions for profit extraction:`);
      
      let totalSOLExtracted = 0;
      let extractionCount = 0;

      // Extrakce vysokých priorit nejdříve
      const urgentPositions = profitPositions.filter(p => p.sellPriority === 'URGENT');
      const highPositions = profitPositions.filter(p => p.sellPriority === 'HIGH');
      
      const positionsToProcess = [...urgentPositions, ...highPositions].slice(0, 5);

      for (const position of positionsToProcess) {
        console.log(`💰 EXTRACTING PROFIT: ${position.symbol}`);
        console.log(`   Expected SOL: ${position.expectedSOL.toFixed(6)}`);
        console.log(`   Priority: ${position.sellPriority}`);

        const extractedSOL = await this.executeSingleProfitExtraction(position);
        
        if (extractedSOL > 0) {
          totalSOLExtracted += extractedSOL;
          extractionCount++;
          
          console.log(`✅ Successfully extracted ${extractedSOL.toFixed(6)} SOL from ${position.symbol}`);
          
          // Zastavit pokud máme dostatečné SOL pro obchodování
          const newBalance = await this.checkSOLBalance();
          if (newBalance >= this.minSOLForTrading) {
            console.log(`🎯 Sufficient SOL balance achieved: ${newBalance.toFixed(6)}`);
            break;
          }

          // Pauza mezi extrakcemi
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`💰 TOTAL PROFIT EXTRACTED: ${totalSOLExtracted.toFixed(6)} SOL`);
      console.log(`📊 Positions liquidated: ${extractionCount}`);
      
      return totalSOLExtracted;

    } catch (error) {
      console.error('❌ Error in systematic profit extraction:', error);
      return 0;
    } finally {
      this.profitExtractionActive = false;
    }
  }

  private async executeSingleProfitExtraction(position: ProfitPosition): Promise<number> {
    try {
      // Získat Jupiter quote pro prodej tokenu za SOL
      const quote = await this.getJupiterSellQuote(position.mint, position.currentBalance);
      
      if (!quote || !quote.outAmount) {
        console.log(`❌ No Jupiter quote available for ${position.symbol}`);
        return 0;
      }

      const expectedSOL = parseInt(quote.outAmount) / 1e9;
      console.log(`📊 Jupiter quote confirmed: ${expectedSOL.toFixed(6)} SOL`);

      if (expectedSOL < 0.001) {
        console.log(`⚠️ Expected SOL too low: ${expectedSOL.toFixed(6)}`);
        return 0;
      }

      // Vytvořit a provést prodejní transakci
      const sellTransaction = await this.createJupiterSellTransaction(quote);
      
      if (!sellTransaction) {
        console.log(`❌ Failed to create sell transaction for ${position.symbol}`);
        return 0;
      }

      console.log(`🔥 EXECUTING SELL TRANSACTION: ${position.symbol} → SOL`);
      
      const result = await phantomLiveTrader.executeRealJupiterSwap(
        position.mint,
        'So11111111111111111111111111111111111111112', // SOL mint
        position.currentBalance
      );

      if (result.success) {
        console.log(`✅ PROFIT EXTRACTION SUCCESSFUL: ${position.symbol}`);
        console.log(`🔗 Transaction: ${result.txHash}`);
        return expectedSOL;
      } else {
        console.log(`❌ Profit extraction failed for ${position.symbol}`);
        return 0;
      }

    } catch (error) {
      console.error(`❌ Error extracting profit from ${position.symbol}:`, error);
      return 0;
    }
  }

  private async getJupiterSellQuote(tokenMint: string, amount: number): Promise<any> {
    try {
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${tokenMint}&outputMint=So11111111111111111111111111111111111111112&amount=${amount}&slippageBps=300`
      );

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error getting Jupiter quote:', error);
      return null;
    }
  }

  private async createJupiterSellTransaction(quote: any): Promise<string | null> {
    try {
      const response = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: process.env.PHANTOM_PUBKEY!,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.swapTransaction;
      }

      return null;
    } catch (error) {
      console.error('Error creating sell transaction:', error);
      return null;
    }
  }

  private async estimateSOLFromSale(mint: string, balance: number, decimals: number): Promise<number> {
    const quote = await this.getJupiterSellQuote(mint, balance);
    if (quote && quote.outAmount) {
      return parseInt(quote.outAmount) / 1e9;
    }
    return 0;
  }

  private async getTokenPrice(mint: string): Promise<number> {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`);
      if (response.ok) {
        const data = await response.json();
        return data.data[mint]?.price || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private async getTokenSymbol(mint: string): Promise<string> {
    // Zjednodušené získání symbolu tokenu
    try {
      // Implementovat získání skutečného symbolu z metadat tokenu
      return mint.substring(0, 8).toUpperCase();
    } catch {
      return mint.substring(0, 8).toUpperCase();
    }
  }

  async startSystematicProfitMonitoring(): Promise<void> {
    console.log('🎯 SYSTEMATIC PROFIT ENGINE ACTIVATED');
    console.log('⚡ Monitoring SOL balance and extracting profits automatically');

    // Kontrola každých 60 sekund
    setInterval(async () => {
      const currentSOL = await this.checkSOLBalance();
      
      if (currentSOL < this.minSOLForTrading) {
        console.log(`🚨 LOW SOL BALANCE DETECTED: ${currentSOL.toFixed(6)} SOL`);
        console.log('💰 Triggering systematic profit extraction...');
        
        await this.executeSystematicProfitExtraction();
      }
    }, 60000);

    // Pravidelná optimalizace každých 5 minut
    setInterval(async () => {
      const positions = await this.analyzeProfitPositions();
      const urgentPositions = positions.filter(p => p.sellPriority === 'URGENT');
      
      if (urgentPositions.length > 0) {
        console.log(`💎 Found ${urgentPositions.length} urgent profit opportunities`);
        await this.executeSystematicProfitExtraction();
      }
    }, 300000);
  }

  async getSystemStatus(): Promise<any> {
    const solBalance = await this.checkSOLBalance();
    const tokenBalances = await this.getAllTokenBalances();
    const profitPositions = await this.analyzeProfitPositions();
    
    return {
      solBalance,
      tokenPositions: tokenBalances.length,
      profitablePositions: profitPositions.filter(p => p.shouldSell).length,
      totalEstimatedValue: profitPositions.reduce((sum, p) => sum + p.estimatedValue, 0),
      totalExpectedSOL: profitPositions.reduce((sum, p) => sum + p.expectedSOL, 0),
      readyForTrading: solBalance >= this.minSOLForTrading,
      extractionActive: this.profitExtractionActive
    };
  }
}

// Initialize with lazy loading to avoid startup errors
let systematicProfitEngineInstance: SystematicProfitEngine | null = null;

export const systematicProfitEngine = {
  getInstance(): SystematicProfitEngine {
    if (!systematicProfitEngineInstance) {
      systematicProfitEngineInstance = new SystematicProfitEngine();
    }
    return systematicProfitEngineInstance;
  },
  
  async executeSystematicProfitExtraction(): Promise<number> {
    return this.getInstance().executeSystematicProfitExtraction();
  },
  
  async getSystemStatus(): Promise<any> {
    return this.getInstance().getSystemStatus();
  },
  
  async analyzeProfitPositions(): Promise<any[]> {
    return this.getInstance().analyzeProfitPositions();
  },
  
  async startSystematicProfitMonitoring(): Promise<void> {
    return this.getInstance().startSystematicProfitMonitoring();
  }
};