import './buffer-polyfill';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Phantom wallet provider interface
interface PhantomProvider {
  isPhantom: boolean;
  publicKey: PublicKey | null;
  isConnected: boolean;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array; publicKey: PublicKey }>;
  connect: (opts?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: string, handler: (args: any) => void) => void;
  request: (method: string, params: any) => Promise<unknown>;
}

declare global {
  interface Window {
    phantom?: {
      solana?: PhantomProvider;
    };
  }
}

class PhantomWalletService {
  private provider: PhantomProvider | null = null;
  private connection: Connection;
  
  constructor() {
    // Use Solana mainnet
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
  }

  async checkIfWalletExists(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    if (window.phantom?.solana?.isPhantom) {
      this.provider = window.phantom.solana;
      return true;
    }
    
    return false;
  }

  async connectWallet(): Promise<{ publicKey: string; balance: number } | null> {
    try {
      const exists = await this.checkIfWalletExists();
      if (!exists) {
        throw new Error('Phantom wallet not found. Please install Phantom wallet extension.');
      }

      if (!this.provider) return null;

      const response = await this.provider.connect();
      
      if (response.publicKey) {
        const balance = await this.getBalance(response.publicKey);
        
        return {
          publicKey: response.publicKey.toString(),
          balance: balance
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error connecting to Phantom wallet:', error);
      throw error;
    }
  }

  async disconnectWallet(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
    }
  }

  async getBalance(publicKey: PublicKey): Promise<number> {
    try {
      // Add timeout and retry logic
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Balance fetch timeout')), 10000)
      );
      
      const balancePromise = this.connection.getBalance(publicKey, 'confirmed');
      
      const balance = await Promise.race([balancePromise, timeoutPromise]) as number;
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      
      // Try with a different RPC endpoint as fallback
      try {
        const fallbackConnection = new Connection('https://solana-api.projectserum.com', 'confirmed');
        const balance = await fallbackConnection.getBalance(publicKey, 'confirmed');
        return balance / LAMPORTS_PER_SOL;
      } catch (fallbackError) {
        console.error('Fallback balance fetch failed:', fallbackError);
        return 0;
      }
    }
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }
    
    return await this.provider.signTransaction(transaction);
  }

  getProvider(): PhantomProvider | null {
    return this.provider;
  }

  isConnected(): boolean {
    return this.provider?.isConnected || false;
  }

  getPublicKey(): PublicKey | null {
    return this.provider?.publicKey || null;
  }
}

export const phantomWallet = new PhantomWalletService();