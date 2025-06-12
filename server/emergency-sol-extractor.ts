/**
 * EMERGENCY SOL EXTRACTOR
 * Direct liquidation system to convert all tokens to SOL for continued trading
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

interface TokenAccount {
  mint: string;
  balance: number;
  decimals: number;
  symbol: string;
}

class EmergencySOLExtractor {
  private connection: Connection;
  private walletPubkey: PublicKey;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
    const pubkeyString = process.env.PHANTOM_PUBKEY || '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
    this.walletPubkey = new PublicKey(pubkeyString);
  }

  async getSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.walletPubkey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      return 0;
    }
  }

  async getAllTokenAccounts(): Promise<TokenAccount[]> {
    try {
      console.log('🔍 Scanning wallet for token accounts...');
      
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.walletPubkey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const accounts: TokenAccount[] = [];
      
      for (const account of tokenAccounts.value) {
        const accountData = account.account.data.parsed.info;
        const balance = accountData.tokenAmount.uiAmount;
        
        if (balance > 0) {
          accounts.push({
            mint: accountData.mint,
            balance: balance,
            decimals: accountData.tokenAmount.decimals,
            symbol: `TOKEN_${accountData.mint.slice(0, 8)}`
          });
        }
      }

      console.log(`📊 Found ${accounts.length} token accounts with balances`);
      return accounts;
    } catch (error) {
      console.error('Error getting token accounts:', error);
      return [];
    }
  }

  async getJupiterQuote(inputMint: string, outputMint: string, amount: number): Promise<any> {
    try {
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=300`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Jupiter quote failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting Jupiter quote:', error);
      return null;
    }
  }

  async estimateSOLFromTokenSale(tokenAccount: TokenAccount): Promise<number> {
    try {
      const solMint = 'So11111111111111111111111111111111111111112';
      const amountInSmallestUnit = Math.floor(tokenAccount.balance * Math.pow(10, tokenAccount.decimals));
      
      const quote = await this.getJupiterQuote(tokenAccount.mint, solMint, amountInSmallestUnit);
      
      if (quote && quote.outAmount) {
        const solAmount = parseInt(quote.outAmount) / 1e9;
        console.log(`💰 ${tokenAccount.symbol}: ${tokenAccount.balance} → ${solAmount.toFixed(6)} SOL`);
        return solAmount;
      }
      
      return 0;
    } catch (error) {
      console.error(`Error estimating SOL for ${tokenAccount.symbol}:`, error);
      return 0;
    }
  }

  async analyzeExtractionPotential(): Promise<{ totalTokens: number; estimatedSOL: number; accounts: TokenAccount[] }> {
    console.log('🚀 ANALYZING EMERGENCY SOL EXTRACTION POTENTIAL');
    
    const currentSOL = await this.getSOLBalance();
    console.log(`💰 Current SOL balance: ${currentSOL.toFixed(6)}`);
    
    const tokenAccounts = await this.getAllTokenAccounts();
    let totalEstimatedSOL = 0;
    
    for (const account of tokenAccounts) {
      const estimatedSOL = await this.estimateSOLFromTokenSale(account);
      totalEstimatedSOL += estimatedSOL;
    }
    
    console.log(`🎯 EXTRACTION ANALYSIS COMPLETE:`);
    console.log(`   Current SOL: ${currentSOL.toFixed(6)}`);
    console.log(`   Token accounts: ${tokenAccounts.length}`);
    console.log(`   Estimated SOL from liquidation: ${totalEstimatedSOL.toFixed(6)}`);
    console.log(`   Total SOL after extraction: ${(currentSOL + totalEstimatedSOL).toFixed(6)}`);
    
    return {
      totalTokens: tokenAccounts.length,
      estimatedSOL: totalEstimatedSOL,
      accounts: tokenAccounts
    };
  }

  async executeEmergencyExtraction(): Promise<number> {
    console.log('🔥 EXECUTING EMERGENCY SOL EXTRACTION');
    
    const analysis = await this.analyzeExtractionPotential();
    
    if (analysis.totalTokens === 0) {
      console.log('❌ No tokens found for extraction');
      return 0;
    }
    
    let totalExtracted = 0;
    
    // For now, we'll simulate the extraction since we need the private key for actual transactions
    console.log('⚠️  SIMULATION MODE: Actual extraction requires private key configuration');
    
    for (const account of analysis.accounts) {
      const estimatedSOL = await this.estimateSOLFromTokenSale(account);
      console.log(`🔄 Would extract ${account.symbol}: ${estimatedSOL.toFixed(6)} SOL`);
      totalExtracted += estimatedSOL;
    }
    
    console.log(`✅ EXTRACTION SIMULATION COMPLETE: ${totalExtracted.toFixed(6)} SOL potential`);
    return totalExtracted;
  }

  async getStatus(): Promise<any> {
    const solBalance = await this.getSOLBalance();
    const tokenAccounts = await this.getAllTokenAccounts();
    
    return {
      currentSOL: solBalance,
      tokenCount: tokenAccounts.length,
      isEmergency: solBalance < 0.01,
      extractionNeeded: tokenAccounts.length > 0 && solBalance < 0.01
    };
  }
}

export const emergencySOLExtractor = new EmergencySOLExtractor();