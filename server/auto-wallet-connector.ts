/**
 * AUTOMATIC WALLET CONNECTOR
 * Restores user's Phantom wallet connection and activates live trading
 */

import { walletConnectionManager } from './wallet-connection';
import { ultraAggressiveTrader } from './ultra-aggressive-trader';

class AutoWalletConnector {
  private reconnectionAttempts = 0;
  private maxAttempts = 3;
  private reconnectionInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startAutoConnection();
  }

  private async startAutoConnection() {
    console.log('🔄 Auto Wallet Connector: Starting automatic wallet restoration...');
    
    // Try to restore connection with stored wallet address
    await this.attemptWalletReconnection();
    
    // Set up periodic connection monitoring
    this.setupConnectionMonitoring();
  }

  private async attemptWalletReconnection() {
    try {
      // Use the wallet address from previous session
      const walletAddress = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
      
      console.log(`🔗 Auto Wallet Connector: Attempting to restore connection to ${walletAddress}`);
      
      const connected = await walletConnectionManager.connectWallet(walletAddress);
      
      if (connected) {
        console.log('✅ Auto Wallet Connector: Wallet connection restored successfully');
        console.log('🚀 Auto Wallet Connector: Live trading activated');
        
        // Ensure Ultra-Aggressive Trader is active
        if (!ultraAggressiveTrader.getStats().isActive) {
          console.log('⚡ Auto Wallet Connector: Activating Ultra-Aggressive Trader...');
          await ultraAggressiveTrader.startTrading();
        }
        
        this.reconnectionAttempts = 0;
      } else {
        this.handleReconnectionFailure();
      }
    } catch (error) {
      console.error('❌ Auto Wallet Connector: Reconnection failed:', error);
      this.handleReconnectionFailure();
    }
  }

  private handleReconnectionFailure() {
    this.reconnectionAttempts++;
    
    if (this.reconnectionAttempts < this.maxAttempts) {
      console.log(`⚠️ Auto Wallet Connector: Reconnection attempt ${this.reconnectionAttempts}/${this.maxAttempts} failed. Retrying in 5 seconds...`);
      
      setTimeout(() => {
        this.attemptWalletReconnection();
      }, 5000);
    } else {
      console.log('❌ Auto Wallet Connector: Max reconnection attempts reached. Manual reconnection required.');
    }
  }

  private setupConnectionMonitoring() {
    // Monitor connection status every 30 seconds
    this.reconnectionInterval = setInterval(() => {
      const walletState = walletConnectionManager.getConnectionState();
      
      if (!walletState.isConnected) {
        console.log('⚠️ Auto Wallet Connector: Wallet disconnected. Attempting automatic reconnection...');
        this.reconnectionAttempts = 0;
        this.attemptWalletReconnection();
      }
    }, 30000);
  }

  public forceReconnection() {
    console.log('🔄 Auto Wallet Connector: Manual reconnection triggered');
    this.reconnectionAttempts = 0;
    this.attemptWalletReconnection();
  }

  public getStatus() {
    const walletState = walletConnectionManager.getConnectionState();
    return {
      isConnected: walletState.isConnected,
      address: walletState.address,
      reconnectionAttempts: this.reconnectionAttempts,
      autoReconnectionActive: this.reconnectionInterval !== null,
      lastUpdate: new Date().toISOString()
    };
  }

  public stop() {
    if (this.reconnectionInterval) {
      clearInterval(this.reconnectionInterval);
      this.reconnectionInterval = null;
      console.log('🛑 Auto Wallet Connector: Connection monitoring stopped');
    }
  }
}

export const autoWalletConnector = new AutoWalletConnector();