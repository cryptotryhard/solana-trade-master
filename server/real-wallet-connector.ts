import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fetch from 'node-fetch';

interface RealWalletState {
  address: string;
  solBalance: number;
  totalValueUSD: number;
  tokenBalances: Array<{
    mint: string;
    symbol: string;
    amount: number;
    valueUSD: number;
  }>;
  lastUpdated: Date;
}

class RealWalletConnector {
  private connection: Connection;
  private walletAddress: string;
  private currentState: RealWalletState | null = null;

  // Use multiple RPC endpoints for reliability
  private rpcEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana.public-rpc.com',
    'https://mainnet.helius-rpc.com/?api-key=' + (process.env.HELIUS_API_KEY || ''),
    'https://solana-api.projectserum.com'
  ];

  private currentRpcIndex = 0;

  constructor(walletAddress: string = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d') {
    this.walletAddress = walletAddress;
    this.connection = new Connection(this.rpcEndpoints[0], 'confirmed');
    
    console.log('🔗 Real Wallet Connector initialized');
    console.log(`📍 Target wallet: ${walletAddress}`);
    console.log('🚫 FAKE TRADING DISABLED - Only real blockchain data');
  }

  private async switchRpcEndpoint(): Promise<void> {
    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcEndpoints.length;
    const newEndpoint = this.rpcEndpoints[this.currentRpcIndex];
    
    if (newEndpoint.includes('undefined') || newEndpoint.includes('null')) {
      return this.switchRpcEndpoint();
    }
    
    this.connection = new Connection(newEndpoint, 'confirmed');
    console.log(`🔄 Switched RPC to: ${newEndpoint}`);
  }

  async fetchRealWalletState(): Promise<RealWalletState> {
    let attempts = 0;
    const maxAttempts = this.rpcEndpoints.length;

    while (attempts < maxAttempts) {
      try {
        console.log(`🔍 Fetching real wallet state from: ${this.rpcEndpoints[this.currentRpcIndex]}`);
        
        const publicKey = new PublicKey(this.walletAddress);
        
        // Get SOL balance
        const solBalanceLamports = await this.connection.getBalance(publicKey);
        const solBalance = solBalanceLamports / LAMPORTS_PER_SOL;

        // Get SOL price
        const solPrice = await this.getCurrentSOLPrice();
        const totalValueUSD = solBalance * solPrice;

        // Get token accounts (SPL tokens)
        const tokenAccounts = await this.getTokenAccounts(publicKey);

        const state: RealWalletState = {
          address: this.walletAddress,
          solBalance,
          totalValueUSD,
          tokenBalances: tokenAccounts,
          lastUpdated: new Date()
        };

        this.currentState = state;
        
        console.log(`💰 REAL WALLET STATE:`);
        console.log(`   SOL Balance: ${solBalance.toFixed(4)} SOL`);
        console.log(`   USD Value: $${totalValueUSD.toFixed(2)}`);
        console.log(`   Token Accounts: ${tokenAccounts.length}`);

        return state;

      } catch (error) {
        console.log(`❌ RPC ${this.currentRpcIndex} failed:`, error.message);
        attempts++;
        
        if (attempts < maxAttempts) {
          await this.switchRpcEndpoint();
        } else {
          throw new Error(`All RPC endpoints failed. Last error: ${error.message}`);
        }
      }
    }

    throw new Error('Failed to fetch wallet state from all RPC endpoints');
  }

  private async getCurrentSOLPrice(): Promise<number> {
    try {
      // Try Jupiter price API first
      const jupiterResponse = await fetch('https://price.jup.ag/v4/price?ids=SOL');
      if (jupiterResponse.ok) {
        const data = await jupiterResponse.json() as any;
        const price = data?.data?.SOL?.price;
        if (price && typeof price === 'number') {
          return price;
        }
      }
    } catch (error) {
      console.log('Jupiter price API failed:', error.message);
    }

    try {
      // Fallback to CoinGecko
      const cgResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (cgResponse.ok) {
        const data = await cgResponse.json() as any;
        const price = data?.solana?.usd;
        if (price && typeof price === 'number') {
          return price;
        }
      }
    } catch (error) {
      console.log('CoinGecko price API failed:', error.message);
    }

    // Final fallback - approximate current SOL price
    console.log('⚠️ Using fallback SOL price');
    return 165; // Approximate current price
  }

  private async getTokenAccounts(publicKey: PublicKey): Promise<Array<{
    mint: string;
    symbol: string;
    amount: number;
    valueUSD: number;
  }>> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const tokens = [];
      
      for (const account of tokenAccounts.value) {
        const parsed = account.account.data.parsed;
        const info = parsed?.info;
        
        if (info && info.tokenAmount.uiAmount > 0) {
          const mint = info.mint;
          const amount = info.tokenAmount.uiAmount;
          
          // Try to get token metadata
          const tokenInfo = await this.getTokenMetadata(mint);
          
          tokens.push({
            mint,
            symbol: tokenInfo.symbol || 'UNKNOWN',
            amount,
            valueUSD: tokenInfo.priceUSD ? amount * tokenInfo.priceUSD : 0
          });
        }
      }

      return tokens;

    } catch (error) {
      console.log('Failed to fetch token accounts:', error.message);
      return [];
    }
  }

  private async getTokenMetadata(mint: string): Promise<{
    symbol: string;
    name: string;
    priceUSD: number;
  }> {
    try {
      // Try Jupiter token list
      const response = await fetch(`https://token.jup.ag/strict`);
      if (response.ok) {
        const tokens = await response.json() as any[];
        const token = tokens.find(t => t.address === mint);
        
        if (token) {
          return {
            symbol: token.symbol || 'UNKNOWN',
            name: token.name || 'Unknown Token',
            priceUSD: 0 // Would need separate price lookup
          };
        }
      }
    } catch (error) {
      console.log('Token metadata lookup failed:', error.message);
    }

    return {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      priceUSD: 0
    };
  }

  getCurrentState(): RealWalletState | null {
    return this.currentState;
  }

  // This method would implement REAL trading via Jupiter
  async executeRealTrade(
    inputMint: string,
    outputMint: string, 
    amountSOL: number
  ): Promise<{ success: boolean; message: string; txHash?: string }> {
    console.log('🛑 REAL TRADING BLOCKED');
    console.log('❌ Real trading requires private key integration and user approval');
    console.log(`💰 Available balance: ${this.currentState?.solBalance.toFixed(4)} SOL`);
    
    return {
      success: false,
      message: `Real trading requires wallet connection with private key. Current balance: ${this.currentState?.solBalance.toFixed(4)} SOL`
    };
  }

  async refreshState(): Promise<RealWalletState> {
    return await this.fetchRealWalletState();
  }
}

export const realWalletConnector = new RealWalletConnector('9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d');

// Auto-refresh wallet state every 30 seconds
setInterval(async () => {
  try {
    await realWalletConnector.refreshState();
  } catch (error) {
    console.log('Failed to refresh wallet state:', error.message);
  }
}, 30000);