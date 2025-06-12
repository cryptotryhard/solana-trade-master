/**
 * EMERGENCY PROFIT HARVESTER
 * Immediate profit extraction system to recover SOL when balance is low
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { phantomLiveTrader } from './phantom-live-trader';

interface TokenPosition {
  mint: string;
  symbol: string;
  balance: number;
  currentPrice: number;
  estimatedValue: number;
}

interface ProfitOpportunity {
  token: TokenPosition;
  expectedSOL: number;
  profitPercent: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

class EmergencyProfitHarvester {
  private connection: Connection;
  private walletPubkey: PublicKey;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
    this.walletPubkey = new PublicKey(process.env.PHANTOM_PUBKEY!);
  }

  async checkEmergencyConditions(): Promise<boolean> {
    try {
      const balance = await this.connection.getBalance(this.walletPubkey);
      const solBalance = balance / 1e9;
      
      console.log(`💰 Current SOL balance: ${solBalance.toFixed(6)} SOL`);
      
      // Emergency if balance < 0.01 SOL (not enough for transactions)
      if (solBalance < 0.01) {
        console.log(`🚨 EMERGENCY CONDITIONS DETECTED`);
        console.log(`⚠️ SOL balance too low for transactions: ${solBalance.toFixed(6)}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Error checking emergency conditions:`, error);
      return false;
    }
  }

  async scanForProfitableTokens(): Promise<ProfitOpportunity[]> {
    console.log(`🔍 SCANNING FOR PROFITABLE TOKEN POSITIONS`);
    
    try {
      // Get all token accounts for the wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.walletPubkey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const opportunities: ProfitOpportunity[] = [];

      for (const account of tokenAccounts.value) {
        const tokenInfo = account.account.data.parsed.info;
        const balance = parseFloat(tokenInfo.tokenAmount.uiAmount || '0');
        
        if (balance > 0) {
          const mint = tokenInfo.mint;
          const currentPrice = await this.getTokenPrice(mint);
          
          if (currentPrice > 0) {
            const estimatedValue = balance * currentPrice;
            const expectedSOL = await this.estimateSOLFromSale(mint, balance);
            
            if (expectedSOL > 0.005) { // Only consider if we can get meaningful SOL back
              opportunities.push({
                token: {
                  mint,
                  symbol: await this.getTokenSymbol(mint),
                  balance,
                  currentPrice,
                  estimatedValue
                },
                expectedSOL,
                profitPercent: 0, // Would calculate from entry price if available
                priority: expectedSOL > 0.05 ? 'HIGH' : expectedSOL > 0.02 ? 'MEDIUM' : 'LOW'
              });
            }
          }
        }
      }

      return opportunities.sort((a, b) => b.expectedSOL - a.expectedSOL);
    } catch (error) {
      console.error(`❌ Error scanning for profitable tokens:`, error);
      return [];
    }
  }

  async executeEmergencyHarvest(): Promise<number> {
    console.log(`🚨 EXECUTING EMERGENCY PROFIT HARVEST`);
    
    const opportunities = await this.scanForProfitableTokens();
    let totalSOLRecovered = 0;

    if (opportunities.length === 0) {
      console.log(`⚠️ No profitable positions found for harvest`);
      return 0;
    }

    console.log(`💎 Found ${opportunities.length} profit opportunities:`);
    
    // Execute high priority harvests first
    const highPriorityOps = opportunities.filter(op => op.priority === 'HIGH');
    const mediumPriorityOps = opportunities.filter(op => op.priority === 'MEDIUM');

    for (const opportunity of [...highPriorityOps, ...mediumPriorityOps].slice(0, 3)) {
      console.log(`💰 Harvesting ${opportunity.token.symbol}`);
      console.log(`   Expected SOL: ${opportunity.expectedSOL.toFixed(4)}`);
      console.log(`   Token balance: ${opportunity.token.balance.toFixed(2)}`);
      
      const recoveredSOL = await this.executeTokenSale(opportunity);
      if (recoveredSOL > 0) {
        totalSOLRecovered += recoveredSOL;
        console.log(`✅ Recovered ${recoveredSOL.toFixed(4)} SOL from ${opportunity.token.symbol}`);
        
        // Stop if we've recovered enough for operations
        if (totalSOLRecovered > 0.1) {
          console.log(`🎯 Sufficient SOL recovered, stopping harvest`);
          break;
        }
      }
    }

    console.log(`💰 TOTAL SOL RECOVERED: ${totalSOLRecovered.toFixed(4)}`);
    return totalSOLRecovered;
  }

  private async executeTokenSale(opportunity: ProfitOpportunity): Promise<number> {
    try {
      // Get Jupiter quote for selling token to SOL
      const quote = await this.getJupiterSellQuote(
        opportunity.token.mint,
        opportunity.token.balance
      );

      if (!quote || !quote.outAmount) {
        console.log(`❌ No quote available for ${opportunity.token.symbol}`);
        return 0;
      }

      const expectedSOL = parseInt(quote.outAmount) / 1e9;
      console.log(`📊 Jupiter quote: ${expectedSOL.toFixed(4)} SOL`);

      // Create and execute sell transaction
      const sellTransaction = await this.createSellTransaction(quote);
      
      if (sellTransaction) {
        const result = await phantomLiveTrader.executeRealJupiterSwap(
          opportunity.token.mint,
          'So11111111111111111111111111111111111111112',
          opportunity.token.balance,
          process.env.PHANTOM_PUBKEY!,
          opportunity.token.symbol
        );

        if (result.success) {
          console.log(`✅ Sale executed: ${opportunity.token.symbol} → SOL`);
          console.log(`🔗 TX: ${result.txHash}`);
          return expectedSOL;
        }
      }

      return 0;
    } catch (error) {
      console.error(`❌ Token sale failed for ${opportunity.token.symbol}:`, error);
      return 0;
    }
  }

  private async getJupiterSellQuote(tokenMint: string, amount: number): Promise<any> {
    try {
      const amountInSmallestUnit = Math.floor(amount);
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${tokenMint}&outputMint=So11111111111111111111111111111111111111112&amount=${amountInSmallestUnit}&slippageBps=500`
      );

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch {
      return null;
    }
  }

  private async createSellTransaction(quote: any): Promise<string | null> {
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
    } catch {
      return null;
    }
  }

  private async estimateSOLFromSale(mint: string, balance: number): Promise<number> {
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
    } catch {
      return 0;
    }
  }

  private async getTokenSymbol(mint: string): Promise<string> {
    // Simplified symbol extraction
    return mint.substring(0, 8);
  }

  async startEmergencyMonitoring(): Promise<void> {
    console.log(`🚨 EMERGENCY PROFIT HARVESTER ACTIVATED`);
    console.log(`⚡ Monitoring SOL balance for emergency harvest triggers`);

    // Check every 30 seconds for emergency conditions
    setInterval(async () => {
      const isEmergency = await this.checkEmergencyConditions();
      
      if (isEmergency) {
        console.log(`🚨 EMERGENCY TRIGGERED - Executing profit harvest`);
        await this.executeEmergencyHarvest();
      }
    }, 30000);
  }
}

export const emergencyProfitHarvester = new EmergencyProfitHarvester();