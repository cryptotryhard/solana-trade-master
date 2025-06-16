import { Connection, PublicKey } from '@solana/web3.js';
import { realBlockchainTrader } from './real-blockchain-trader';

interface ValidatedTrade {
  txHash: string;
  confirmed: boolean;
  blockTime: number;
  amount: number;
  tokenMint: string;
  solReceived?: number;
  tokensReceived?: number;
  realPnL?: number;
}

export class RealTradeValidator {
  private connection: Connection;
  private confirmedTrades: Map<string, ValidatedTrade> = new Map();

  constructor() {
    this.connection = new Connection(
      process.env.QUICKNODE_RPC_URL || 
      'https://mainnet.helius-rpc.com/?api-key=80a5abeb-622a-4fdf-905a-ac5b5842a167'
    );
  }

  async validateTradeOnChain(txHash: string): Promise<ValidatedTrade | null> {
    try {
      console.log(`🔍 VALIDATING ON-CHAIN: ${txHash.slice(0, 8)}...`);
      
      const transaction = await this.connection.getTransaction(txHash, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!transaction) {
        console.log(`❌ Transaction not found: ${txHash}`);
        return null;
      }

      if (transaction.meta?.err) {
        console.log(`❌ Transaction failed: ${txHash}`);
        return null;
      }

      const validated: ValidatedTrade = {
        txHash,
        confirmed: true,
        blockTime: transaction.blockTime || Date.now() / 1000,
        amount: 0,
        tokenMint: '',
        solReceived: 0,
        tokensReceived: 0
      };

      // Parse transaction for actual amounts
      const preBalances = transaction.meta?.preBalances || [];
      const postBalances = transaction.meta?.postBalances || [];
      
      if (preBalances.length > 0 && postBalances.length > 0) {
        const solChange = (postBalances[0] - preBalances[0]) / 1e9;
        validated.amount = Math.abs(solChange);
        validated.solReceived = solChange > 0 ? solChange : 0;
      }

      this.confirmedTrades.set(txHash, validated);
      console.log(`✅ CONFIRMED ON-CHAIN: ${txHash.slice(0, 8)}... | Amount: ${validated.amount.toFixed(4)} SOL`);
      
      return validated;
      
    } catch (error) {
      console.log(`❌ Validation failed for ${txHash}: ${error}`);
      return null;
    }
  }

  async executeBuyWithValidation(tokenMint: string, solAmount: number): Promise<ValidatedTrade | null> {
    try {
      console.log(`🚀 EXECUTING REAL BUY: ${solAmount.toFixed(4)} SOL → ${tokenMint.slice(0, 8)}...`);
      
      const txHash = await realBlockchainTrader.buyToken(tokenMint, solAmount);
      
      if (!txHash) {
        console.log(`❌ Buy transaction failed`);
        return null;
      }

      // Wait for confirmation
      await this.waitForConfirmation(txHash);
      
      return await this.validateTradeOnChain(txHash);
      
    } catch (error) {
      console.log(`❌ Buy execution failed: ${error}`);
      return null;
    }
  }

  async executeSellWithValidation(tokenMint: string, tokenAmount: number): Promise<ValidatedTrade | null> {
    try {
      console.log(`💰 EXECUTING REAL SELL: ${tokenAmount.toFixed(0)} tokens → SOL`);
      
      const txHash = await realBlockchainTrader.sellToken(tokenMint, tokenAmount);
      
      if (!txHash) {
        console.log(`❌ Sell transaction failed`);
        return null;
      }

      // Wait for confirmation
      await this.waitForConfirmation(txHash);
      
      return await this.validateTradeOnChain(txHash);
      
    } catch (error) {
      console.log(`❌ Sell execution failed: ${error}`);
      return null;
    }
  }

  private async waitForConfirmation(txHash: string, maxWait: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        const status = await this.connection.getSignatureStatus(txHash);
        
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          console.log(`✅ Transaction confirmed: ${txHash}`);
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        // Continue waiting
      }
    }
    
    console.log(`⏰ Confirmation timeout for: ${txHash}`);
  }

  getConfirmedTrades(): ValidatedTrade[] {
    return Array.from(this.confirmedTrades.values());
  }

  isTradeConfirmed(txHash: string): boolean {
    return this.confirmedTrades.has(txHash);
  }

  calculateRealPnL(entryTrade: ValidatedTrade, exitTrade: ValidatedTrade): number {
    if (!entryTrade.confirmed || !exitTrade.confirmed) {
      return 0;
    }
    
    const entryValue = entryTrade.amount;
    const exitValue = exitTrade.solReceived || 0;
    
    return ((exitValue - entryValue) / entryValue) * 100;
  }
}

export const realTradeValidator = new RealTradeValidator();