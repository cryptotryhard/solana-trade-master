/**
 * REAL WALLET ONLY TRADER
 * Uses ONLY authentic tokens from the actual Phantom wallet
 * NO fake tokens, NO simulation, NO generated mints
 */

import { realBlockchainTrader } from './real-blockchain-trader';
import { Connection, PublicKey } from '@solana/web3.js';

interface AuthenticToken {
  mint: string;
  symbol: string;
  balance: number;
  decimals: number;
  usdValue: number;
  isLiquidatable: boolean;
}

interface RealTradeResult {
  success: boolean;
  txHash: string | null;
  error?: string;
}

export class RealWalletOnlyTrader {
  private targetWallet = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
  private connection: Connection;
  private authenticTokens: AuthenticToken[] = [];

  constructor() {
    this.connection = new Connection(process.env.QUICKNODE_RPC_URL!, 'confirmed');
    this.initializeAuthentication();
  }

  private async initializeAuthentication(): Promise<void> {
    try {
      const walletAddress = realBlockchainTrader.getWalletAddress();
      
      if (walletAddress !== this.targetWallet) {
        console.error(`❌ WALLET MISMATCH: Expected ${this.targetWallet}, got ${walletAddress}`);
        return;
      }

      console.log(`✅ AUTHENTIC WALLET VERIFIED: ${walletAddress}`);
      await this.loadRealTokenHoldings();
      
    } catch (error) {
      console.error('❌ Authentication failed:', error);
    }
  }

  private async loadRealTokenHoldings(): Promise<void> {
    try {
      console.log('🔍 Loading authentic token holdings from blockchain...');
      
      const walletPubkey = new PublicKey(this.targetWallet);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(walletPubkey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      });

      this.authenticTokens = [];

      for (const tokenAccount of tokenAccounts.value) {
        const accountData = tokenAccount.account.data.parsed;
        const tokenInfo = accountData.info;
        
        if (parseFloat(tokenInfo.tokenAmount.amount) > 0) {
          const mint = tokenInfo.mint;
          const balance = parseFloat(tokenInfo.tokenAmount.amount);
          const decimals = tokenInfo.tokenAmount.decimals;
          
          // Only include well-known, tradeable tokens
          const knownTokens = new Set([
            'So11111111111111111111111111111111111111112', // SOL
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
            'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF
            'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
            '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // SAMO
            '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', // POPCAT
          ]);

          if (knownTokens.has(mint)) {
            const token: AuthenticToken = {
              mint,
              symbol: this.getTokenSymbol(mint),
              balance: balance / Math.pow(10, decimals),
              decimals,
              usdValue: 0, // Will be populated by price service
              isLiquidatable: mint !== 'So11111111111111111111111111111111111111112'
            };

            this.authenticTokens.push(token);
            console.log(`✅ Found authentic token: ${token.symbol} - ${token.balance.toFixed(4)}`);
          }
        }
      }

      console.log(`📊 Loaded ${this.authenticTokens.length} authentic tokens for trading`);
      
    } catch (error) {
      console.error('❌ Failed to load real token holdings:', error);
    }
  }

  async executeRealLiquidation(tokenMint: string): Promise<RealTradeResult> {
    const token = this.authenticTokens.find(t => t.mint === tokenMint);
    
    if (!token) {
      return {
        success: false,
        txHash: null,
        error: `Token ${tokenMint} not found in authentic holdings`
      };
    }

    if (!token.isLiquidatable) {
      return {
        success: false,
        txHash: null,
        error: `Token ${token.symbol} is not liquidatable`
      };
    }

    try {
      console.log(`🔥 REAL LIQUIDATION: ${token.symbol} - ${token.balance.toFixed(4)} tokens`);
      
      const rawAmount = Math.floor(token.balance * Math.pow(10, token.decimals));
      const txHash = await realBlockchainTrader.sellToken(token.mint, rawAmount);
      
      if (txHash) {
        console.log(`✅ LIQUIDATION SUCCESS: ${token.symbol} | TX: ${txHash}`);
        
        // Remove liquidated token from holdings
        this.authenticTokens = this.authenticTokens.filter(t => t.mint !== tokenMint);
        
        return {
          success: true,
          txHash,
        };
      } else {
        return {
          success: false,
          txHash: null,
          error: 'Jupiter swap failed'
        };
      }
      
    } catch (error) {
      console.error(`❌ Liquidation failed for ${token.symbol}:`, error);
      return {
        success: false,
        txHash: null,
        error: error.toString()
      };
    }
  }

  async liquidateAllTokens(): Promise<RealTradeResult[]> {
    console.log('🔥 LIQUIDATING ALL AUTHENTIC TOKENS TO SOL');
    
    const results: RealTradeResult[] = [];
    const liquidatableTokens = this.authenticTokens.filter(t => t.isLiquidatable);

    for (const token of liquidatableTokens) {
      if (token.usdValue > 1.0) { // Only liquidate tokens worth > $1
        const result = await this.executeRealLiquidation(token.mint);
        results.push(result);
        
        // Wait between trades to avoid rate limits
        await this.delay(3000);
      }
    }

    console.log(`✅ Liquidation complete: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  getAuthenticTokens(): AuthenticToken[] {
    return this.authenticTokens;
  }

  getTargetWallet(): string {
    return this.targetWallet;
  }

  private getTokenSymbol(mint: string): string {
    const symbols: { [key: string]: string } = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIF',
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'SAMO',
      '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'POPCAT',
    };

    return symbols[mint] || 'UNKNOWN';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const realWalletOnlyTrader = new RealWalletOnlyTrader();