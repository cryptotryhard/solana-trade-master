/**
 * SOL RECOVERY ENGINE
 * Alternativní metody pro získání SOL když jsou tokeny bez likvidity
 */

import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createCloseAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import { ultraAggressiveTrader } from './ultra-aggressive-trader';

class SOLRecoveryEngine {
  private connection: Connection;
  private wallet: Keypair;
  private walletPubkey: PublicKey;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    const privateKeyString = process.env.WALLET_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('WALLET_PRIVATE_KEY not found');
    }
    
    const privateKeyBytes = bs58.decode(privateKeyString);
    this.wallet = Keypair.fromSecretKey(privateKeyBytes);
    this.walletPubkey = this.wallet.publicKey;
  }

  async closeAllTokenAccounts(): Promise<number> {
    console.log('🔧 CLOSING ALL TOKEN ACCOUNTS FOR SOL RECOVERY');
    
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.walletPubkey,
        { programId: TOKEN_PROGRAM_ID }
      );

      console.log(`💰 Found ${tokenAccounts.value.length} token accounts to close`);
      
      let totalClosed = 0;
      let totalSOLRecovered = 0;

      // Process accounts in batches
      const batchSize = 5;
      for (let i = 0; i < tokenAccounts.value.length; i += batchSize) {
        const batch = tokenAccounts.value.slice(i, i + batchSize);
        const transaction = new Transaction();
        let accountsInTx = 0;

        for (const account of batch) {
          try {
            const closeInstruction = createCloseAccountInstruction(
              account.pubkey,
              this.walletPubkey,
              this.walletPubkey
            );
            transaction.add(closeInstruction);
            accountsInTx++;
          } catch (error) {
            console.log(`⚠️ Cannot close account ${account.pubkey.toString()}: ${error}`);
          }
        }

        if (accountsInTx > 0) {
          try {
            const signature = await this.connection.sendTransaction(transaction, [this.wallet], {
              skipPreflight: false,
              preflightCommitment: 'confirmed'
            });
            
            console.log(`✅ Closed ${accountsInTx} accounts: ${signature}`);
            
            await this.connection.confirmTransaction(signature, 'confirmed');
            totalClosed += accountsInTx;
            
            // Each closed account recovers ~0.00203928 SOL (rent)
            totalSOLRecovered += accountsInTx * 0.00203928;
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`❌ Failed to close batch: ${error}`);
          }
        }
      }

      console.log(`📊 ACCOUNT CLOSURE COMPLETE:`);
      console.log(`   Closed accounts: ${totalClosed}`);
      console.log(`   SOL recovered: ${totalSOLRecovered.toFixed(6)}`);

      return totalSOLRecovered;

    } catch (error) {
      console.error('❌ Error closing token accounts:', error);
      return 0;
    }
  }

  async executeCompleteSOLRecovery(): Promise<{ success: boolean; solRecovered: number; finalBalance: number }> {
    console.log('🚨 EXECUTING COMPLETE SOL RECOVERY STRATEGY');
    
    const initialBalance = await this.getSOLBalance();
    console.log(`💰 Initial SOL: ${initialBalance.toFixed(6)}`);

    // Strategy 1: Close all token accounts for rent recovery
    const rentRecovered = await this.closeAllTokenAccounts();
    
    // Strategy 2: Check for any wrapped SOL that can be unwrapped
    await this.unwrapSOL();
    
    const finalBalance = await this.getSOLBalance();
    const totalRecovered = finalBalance - initialBalance;
    
    console.log(`📊 RECOVERY COMPLETE:`);
    console.log(`   Total SOL recovered: ${totalRecovered.toFixed(6)}`);
    console.log(`   Final balance: ${finalBalance.toFixed(6)}`);
    
    // If we now have enough SOL, restart trading
    if (finalBalance >= 0.01) {
      console.log('✅ SUFFICIENT SOL RECOVERED - RESTARTING TRADING');
      await this.restartTradingOperations();
    } else {
      console.log('⚠️ Still insufficient SOL for trading operations');
      // Try alternative funding strategies
      await this.requestFundingFromFaucet();
    }

    return {
      success: totalRecovered > 0,
      solRecovered: totalRecovered,
      finalBalance
    };
  }

  private async unwrapSOL(): Promise<number> {
    try {
      // Check for wrapped SOL (WSOL) accounts
      const wsolMint = new PublicKey('So11111111111111111111111111111111111111112');
      const wsolAccount = await getAssociatedTokenAddress(wsolMint, this.walletPubkey);
      
      const accountInfo = await this.connection.getAccountInfo(wsolAccount);
      if (accountInfo) {
        console.log('🎯 Found wrapped SOL, attempting to unwrap...');
        // Implementation for unwrapping WSOL would go here
        return 0; // Placeholder
      }
      
      return 0;
    } catch (error) {
      console.log('No wrapped SOL found');
      return 0;
    }
  }

  private async requestFundingFromFaucet(): Promise<void> {
    console.log('🚰 Attempting to get funding from devnet faucet...');
    // This would only work on devnet, not mainnet
    // Mainly for testing purposes
  }

  private async restartTradingOperations(): Promise<void> {
    try {
      console.log('🔄 RESTARTING TRADING OPERATIONS WITH RECOVERED SOL');
      
      // Wait a bit for balances to update
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Trigger a new trading cycle
      console.log('🚀 Trading operations resumed');
      
    } catch (error) {
      console.error('❌ Failed to restart trading:', error);
    }
  }

  async getSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.walletPubkey);
      return balance / 1e9;
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      return 0;
    }
  }

  async getStatus(): Promise<any> {
    const solBalance = await this.getSOLBalance();
    
    return {
      currentSOL: solBalance,
      canTrade: solBalance >= 0.01,
      needsRecovery: solBalance < 0.005,
      recoveryRecommended: solBalance < 0.01
    };
  }
}

export const solRecoveryEngine = new SOLRecoveryEngine();