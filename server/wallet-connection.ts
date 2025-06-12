/**
 * WALLET CONNECTION MANAGER
 * Handles real Phantom wallet connection for live trading
 */

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { phantomWalletIntegration } from './phantom-wallet-integration';

interface WalletConnectionState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  lastUpdated: Date;
}

class WalletConnectionManager {
  private connectionState: WalletConnectionState = {
    isConnected: false,
    address: null,
    balance: 0,
    lastUpdated: new Date()
  };

  private userWalletAddress: string | null = null;
  private connection: Connection;

  constructor() {
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
      
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  // Connect user's wallet address for monitoring
  async connectWallet(walletAddress: string): Promise<boolean> {
    try {
      // Validate wallet address
      const publicKey = new PublicKey(walletAddress);
      
      // Get wallet balance to verify it exists
      const balance = await this.connection.getBalance(publicKey);
      
      this.userWalletAddress = walletAddress;
      this.connectionState = {
        isConnected: true,
        address: walletAddress,
        balance: balance / 1e9, // Convert lamports to SOL
        lastUpdated: new Date()
      };

      console.log(`✅ Wallet connected: ${walletAddress}`);
      console.log(`💰 Balance: ${this.connectionState.balance.toFixed(4)} SOL`);

      // Update phantom wallet integration to use this address
      (phantomWalletIntegration as any).updateWalletAddress(walletAddress);

      return true;
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      return false;
    }
  }

  // Get current wallet connection status
  getConnectionState(): WalletConnectionState {
    return this.connectionState;
  }

  // Check if wallet is connected and ready for trading
  isReadyForTrading(): boolean {
    return this.connectionState.isConnected && 
           this.connectionState.address !== null &&
           this.connectionState.balance > 0.01; // Minimum 0.01 SOL for fees
  }

  // Get current wallet address
  getCurrentWalletAddress(): string | null {
    return this.userWalletAddress;
  }

  // Update wallet balance
  async updateBalance(): Promise<void> {
    if (!this.userWalletAddress) return;

    try {
      const publicKey = new PublicKey(this.userWalletAddress);
      const balance = await this.connection.getBalance(publicKey);
      
      this.connectionState.balance = balance / 1e9;
      this.connectionState.lastUpdated = new Date();
    } catch (error) {
      console.error('❌ Failed to update wallet balance:', error);
    }
  }

  // Disconnect wallet
  disconnectWallet(): void {
    this.userWalletAddress = null;
    this.connectionState = {
      isConnected: false,
      address: null,
      balance: 0,
      lastUpdated: new Date()
    };
    console.log('🔌 Wallet disconnected');
  }
}

export const walletConnectionManager = new WalletConnectionManager();