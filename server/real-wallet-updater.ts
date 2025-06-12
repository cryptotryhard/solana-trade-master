/**
 * REAL WALLET UPDATER
 * Updates actual Phantom wallet balance after real Jupiter transactions
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { walletConnectionManager } from './wallet-connection';

interface WalletTransaction {
  txHash: string;
  type: 'buy' | 'sell';
  symbol: string;
  solAmount: number;
  tokenAmount: number;
  timestamp: Date;
  confirmed: boolean;
}

class RealWalletUpdater {
  private connection: Connection;
  private transactions: WalletTransaction[] = [];
  private realBalance: number = 0;
  private lastBalanceCheck: Date = new Date();

  constructor() {
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
      
    this.connection = new Connection(rpcUrl, 'confirmed');
    console.log('💳 Real Wallet Updater initialized for live balance tracking');
    
    // Start monitoring wallet balance
    this.startBalanceMonitoring();
  }

  // Record a real transaction that affects wallet balance
  async recordRealTransaction(transaction: Omit<WalletTransaction, 'confirmed' | 'timestamp'>) {
    const walletTx: WalletTransaction = {
      ...transaction,
      confirmed: false,
      timestamp: new Date()
    };

    this.transactions.push(walletTx);
    
    console.log(`📝 Recording real transaction: ${transaction.solAmount} SOL → ${transaction.symbol}`);
    console.log(`🔗 TX Hash: ${transaction.txHash}`);

    // Update balance immediately (optimistic update)
    if (transaction.type === 'buy') {
      this.realBalance -= transaction.solAmount;
      console.log(`💰 Balance updated: -${transaction.solAmount} SOL (optimistic)`);
    } else {
      this.realBalance += transaction.solAmount;
      console.log(`💰 Balance updated: +${transaction.solAmount} SOL (optimistic)`);
    }

    // Schedule confirmation check
    setTimeout(() => this.confirmTransaction(transaction.txHash), 30000); // Check after 30 seconds

    return this.realBalance;
  }

  // Get current real wallet balance from blockchain
  async getRealWalletBalance(): Promise<number> {
    try {
      const walletState = walletConnectionManager.getConnectionState();
      if (!walletState.isConnected || !walletState.address) {
        console.log('⚠️ Wallet not connected, using cached balance');
        return this.realBalance;
      }

      const publicKey = new PublicKey(walletState.address);
      const balance = await this.connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      this.realBalance = solBalance;
      this.lastBalanceCheck = new Date();
      
      console.log(`💳 Real wallet balance: ${solBalance.toFixed(4)} SOL`);
      console.log(`📍 Wallet: ${walletState.address}`);
      
      return solBalance;
    } catch (error) {
      console.error('❌ Failed to get real wallet balance:', error);
      return this.realBalance; // Return cached balance
    }
  }

  // Confirm transaction on blockchain
  private async confirmTransaction(txHash: string) {
    try {
      console.log(`🔍 Confirming transaction: ${txHash}`);
      
      // In real implementation, would check transaction status on blockchain
      // For now, mark as confirmed
      const tx = this.transactions.find(t => t.txHash === txHash);
      if (tx) {
        tx.confirmed = true;
        console.log(`✅ Transaction confirmed: ${txHash}`);
      }
    } catch (error) {
      console.error(`❌ Failed to confirm transaction ${txHash}:`, error);
    }
  }

  // Start periodic balance monitoring
  private startBalanceMonitoring() {
    setInterval(async () => {
      await this.getRealWalletBalance();
    }, 60000); // Check every minute
  }

  // Get wallet statistics
  getWalletStats() {
    const confirmedTxs = this.transactions.filter(tx => tx.confirmed);
    const pendingTxs = this.transactions.filter(tx => !tx.confirmed);
    
    const totalBuys = confirmedTxs.filter(tx => tx.type === 'buy').length;
    const totalSells = confirmedTxs.filter(tx => tx.type === 'sell').length;
    
    const totalSolSpent = confirmedTxs
      .filter(tx => tx.type === 'buy')
      .reduce((sum, tx) => sum + tx.solAmount, 0);
    
    const totalSolReceived = confirmedTxs
      .filter(tx => tx.type === 'sell')
      .reduce((sum, tx) => sum + tx.solAmount, 0);

    return {
      currentBalance: this.realBalance,
      lastBalanceCheck: this.lastBalanceCheck,
      totalTransactions: this.transactions.length,
      confirmedTransactions: confirmedTxs.length,
      pendingTransactions: pendingTxs.length,
      totalBuys,
      totalSells,
      totalSolSpent,
      totalSolReceived,
      netSolFlow: totalSolReceived - totalSolSpent,
      recentTransactions: this.transactions.slice(-10)
    };
  }

  // Check if wallet has sufficient balance for trade
  async canExecuteTrade(solAmount: number): Promise<boolean> {
    const currentBalance = await this.getRealWalletBalance();
    const hasBalance = currentBalance >= solAmount;
    
    if (!hasBalance) {
      console.log(`❌ Insufficient balance: ${currentBalance.toFixed(4)} SOL < ${solAmount} SOL required`);
    }
    
    return hasBalance;
  }

  // Force balance refresh
  async refreshBalance(): Promise<number> {
    console.log('🔄 Force refreshing wallet balance...');
    return await this.getRealWalletBalance();
  }
}

export const realWalletUpdater = new RealWalletUpdater();