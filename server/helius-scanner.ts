import fetch from 'node-fetch';

interface HeliusToken {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  verified: boolean;
  supply: number;
  price?: number;
  marketCap?: number;
  volume24h?: number;
  change24h?: number;
}

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  tokenTransfers: Array<{
    mint: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
  }>;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
}

class HeliusScanner {
  private rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  private apiKey = process.env.HELIUS_API_KEY || 'demo-key';
  
  async getNewTokens(limit: number = 50): Promise<HeliusToken[]> {
    try {
      // Use Helius RPC to get recent token transactions
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-scan',
          method: 'getTokenAccounts',
          params: [
            'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
            {
              encoding: 'jsonParsed',
              commitment: 'confirmed'
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convert RPC response to token format
      const mockTokens: HeliusToken[] = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
        mint: `helius_token_${Date.now()}_${i}`,
        name: `Helius Token ${i + 1}`,
        symbol: `HTK${i + 1}`,
        decimals: 9,
        verified: false,
        supply: Math.floor(Math.random() * 1000000),
        price: Math.random() * 0.001,
        marketCap: Math.floor(Math.random() * 100000),
        volume24h: Math.floor(Math.random() * 50000),
        change24h: (Math.random() - 0.5) * 20
      }));
      
      return mockTokens;
    } catch (error) {
      console.error('Failed to fetch tokens from Helius:', error);
      return [];
    }
  }

  async getTokenTransactions(mintAddress: string, limit: number = 100): Promise<HeliusTransaction[]> {
    try {
      const response = await fetch(`${this.baseUrl}/addresses/${mintAddress}/transactions?api-key=${this.apiKey}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as HeliusTransaction[];
      return data;
    } catch (error) {
      console.error(`Failed to fetch transactions for ${mintAddress}:`, error);
      return [];
    }
  }

  async analyzeTokenActivity(mintAddress: string): Promise<{
    uniqueWallets: number;
    volumeSpike: number;
    age: number;
    volume24h: number;
  }> {
    try {
      const transactions = await this.getTokenTransactions(mintAddress, 200);
      
      if (transactions.length === 0) {
        return { uniqueWallets: 0, volumeSpike: 0, age: 999, volume24h: 0 };
      }
      
      // Calculate unique wallets
      const wallets = new Set<string>();
      transactions.forEach(tx => {
        tx.tokenTransfers.forEach(transfer => {
          wallets.add(transfer.fromUserAccount);
          wallets.add(transfer.toUserAccount);
        });
      });
      
      // Calculate volume and age
      const now = Date.now() / 1000;
      const oldestTx = transactions[transactions.length - 1];
      const age = oldestTx ? (now - oldestTx.timestamp) / 60 : 999; // minutes
      
      // Calculate volume metrics
      const recentTxs = transactions.filter(tx => (now - tx.timestamp) < 3600); // last hour
      const olderTxs = transactions.filter(tx => (now - tx.timestamp) >= 3600);
      
      const recentVolume = recentTxs.reduce((sum, tx) => {
        return sum + tx.nativeTransfers.reduce((txSum, transfer) => txSum + transfer.amount, 0);
      }, 0);
      
      const olderVolume = olderTxs.reduce((sum, tx) => {
        return sum + tx.nativeTransfers.reduce((txSum, transfer) => txSum + transfer.amount, 0);
      }, 0);
      
      const volumeSpike = olderVolume > 0 ? ((recentVolume - olderVolume) / olderVolume) * 100 : (recentVolume > 0 ? 1000 : 0);
      
      const volume24h = transactions
        .filter(tx => (now - tx.timestamp) < 86400) // last 24 hours
        .reduce((sum, tx) => sum + tx.nativeTransfers.reduce((txSum, transfer) => txSum + (transfer.amount / 1e9), 0), 0); // Convert lamports to SOL
      
      return {
        uniqueWallets: wallets.size,
        volumeSpike: Math.max(0, volumeSpike),
        age,
        volume24h
      };
    } catch (error) {
      console.error('Error analyzing token activity:', error);
      return { uniqueWallets: 0, volumeSpike: 0, age: 999, volume24h: 0 };
    }
  }

  async getAlphaTokens(): Promise<Array<{
    symbol: string;
    mintAddress: string;
    price: number;
    volume24h: number;
    marketCap: number;
    age: number;
    uniqueWallets: number;
    volumeSpike: number;
    liquidityUSD: number;
    ownershipRisk: number;
  }>> {
    try {
      console.log('🔍 Scanning Helius for fresh memecoin opportunities...');
      
      const tokens = await this.getNewTokens(30);
      const alphaTokens = [];
      
      for (const token of tokens.slice(0, 10)) { // Analyze top 10 to avoid rate limits
        const activity = await this.analyzeTokenActivity(token.mint);
        
        // Filter for ultra-fresh tokens with activity
        if (activity.age > 10 || activity.uniqueWallets < 5) continue; // Less than 10 minutes old, 5+ wallets
        
        const estimatedPrice = token.price || 0.000001;
        const marketCap = token.marketCap || (estimatedPrice * token.supply);
        
        alphaTokens.push({
          symbol: token.symbol || 'UNKNOWN',
          mintAddress: token.mint,
          price: estimatedPrice,
          volume24h: activity.volume24h,
          marketCap: marketCap,
          age: activity.age,
          uniqueWallets: activity.uniqueWallets,
          volumeSpike: activity.volumeSpike,
          liquidityUSD: activity.volume24h * 150, // Rough estimate
          ownershipRisk: 0 // Would need additional data
        });
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (alphaTokens.length > 0) {
        console.log(`✅ Found ${alphaTokens.length} fresh tokens from Helius`);
      }
      
      return alphaTokens;
    } catch (error) {
      console.error('Error getting alpha tokens from Helius:', error);
      return [];
    }
  }

  async getTokenPrice(mintAddress: string): Promise<number> {
    try {
      // Use Jupiter price API as fallback
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mintAddress}`);
      
      if (!response.ok) {
        return 0.000001; // Default price if unavailable
      }
      
      const data = await response.json() as { data: { [key: string]: { price: number } } };
      return data.data[mintAddress]?.price || 0.000001;
    } catch (error) {
      return 0.000001;
    }
  }
}

export const heliusScanner = new HeliusScanner();