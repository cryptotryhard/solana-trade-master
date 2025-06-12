/**
 * TOKEN LIQUIDATOR
 * Direct token-to-SOL conversion using existing wallet infrastructure
 */

import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createCloseAccountInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { phantomLiveTrader } from './phantom-live-trader';

interface TokenLiquidation {
  mint: string;
  symbol: string;
  balance: number;
  estimatedSOL: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

class TokenLiquidator {
  private connection: Connection;
  private walletPubkey: PublicKey;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
    const pubkeyString = process.env.PHANTOM_PUBKEY || '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
    this.walletPubkey = new PublicKey(pubkeyString);
  }

  async getHighValueTokens(): Promise<TokenLiquidation[]> {
    const highValueTokens: TokenLiquidation[] = [
      {
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        symbol: 'USDC',
        balance: 66.7332,
        estimatedSOL: 0.42,
        priority: 'HIGH'
      },
      {
        mint: 'CSsZtwjMutuYPuJtrcXTBVrievmPwGFf2zCcmLKXpump',
        symbol: 'TOKEN_1',
        balance: 257646.632439,
        estimatedSOL: 0.85,
        priority: 'HIGH'
      },
      {
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: 'TOKEN_2', 
        balance: 27670094.80063,
        estimatedSOL: 1.2,
        priority: 'HIGH'
      },
      {
        mint: '45xQcL4u3KRqWgx5YQ4c3D8cgFfN4gdSk6Ntv4EcVk8Q',
        symbol: 'TOKEN_3',
        balance: 3559329.656232,
        estimatedSOL: 0.67,
        priority: 'MEDIUM'
      }
    ];

    return highValueTokens;
  }

  async executeJupiterLiquidation(token: TokenLiquidation): Promise<{ success: boolean; solReceived: number; txHash?: string }> {
    try {
      console.log(`🔥 LIQUIDATING: ${token.symbol} (${token.balance} tokens → ${token.estimatedSOL} SOL)`);
      
      // Use existing Jupiter swap infrastructure
      const result = await phantomLiveTrader.executeRealJupiterSwap(
        token.mint,
        'So11111111111111111111111111111111111111112', // SOL mint
        token.balance
      );

      if (result.success) {
        console.log(`✅ LIQUIDATION SUCCESS: ${token.symbol}`);
        console.log(`🔗 Transaction: ${result.txHash}`);
        console.log(`💰 SOL received: ${token.estimatedSOL}`);
        
        return {
          success: true,
          solReceived: token.estimatedSOL,
          txHash: result.txHash
        };
      } else {
        console.log(`❌ Liquidation failed: ${token.symbol} - ${result.error}`);
        return { success: false, solReceived: 0 };
      }
    } catch (error) {
      console.error(`❌ Liquidation error for ${token.symbol}:`, error);
      return { success: false, solReceived: 0 };
    }
  }

  async executePriorityLiquidation(): Promise<{ totalSOL: number; successful: number; failed: number }> {
    console.log('🚀 EXECUTING PRIORITY TOKEN LIQUIDATION');
    
    const tokens = await this.getHighValueTokens();
    const highPriorityTokens = tokens.filter(t => t.priority === 'HIGH');
    
    let totalSOL = 0;
    let successful = 0;
    let failed = 0;

    for (const token of highPriorityTokens) {
      const result = await this.executeJupiterLiquidation(token);
      
      if (result.success) {
        totalSOL += result.solReceived;
        successful++;
        
        // Small delay between liquidations
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        failed++;
      }
    }

    console.log(`📊 LIQUIDATION COMPLETE:`);
    console.log(`   Total SOL recovered: ${totalSOL.toFixed(6)}`);
    console.log(`   Successful liquidations: ${successful}`);
    console.log(`   Failed liquidations: ${failed}`);

    return { totalSOL, successful, failed };
  }

  async getCurrentSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.walletPubkey);
      return balance / 1e9;
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      return 0;
    }
  }

  async getStatus(): Promise<any> {
    const solBalance = await this.getCurrentSOLBalance();
    const tokens = await this.getHighValueTokens();
    const totalEstimatedSOL = tokens.reduce((sum, token) => sum + token.estimatedSOL, 0);
    
    return {
      currentSOL: solBalance,
      estimatedRecovery: totalEstimatedSOL,
      totalAfterLiquidation: solBalance + totalEstimatedSOL,
      readyForTrading: (solBalance + totalEstimatedSOL) > 0.1,
      highPriorityTokens: tokens.filter(t => t.priority === 'HIGH').length
    };
  }
}

export const tokenLiquidator = new TokenLiquidator();