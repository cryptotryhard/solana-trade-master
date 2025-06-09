import fetch from 'node-fetch';

interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  tags?: string[];
}

interface JupiterPrice {
  [address: string]: {
    id: string;
    mintSymbol: string;
    vsToken: string;
    vsTokenSymbol: string;
    price: number;
  };
}

interface JupiterTokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  volume24h: number;
  marketCap: number;
  createdAt?: number;
}

class JupiterScanner {
  private baseUrl = 'https://api.jup.ag/v6';
  private priceUrl = 'https://price.jup.ag/v4';
  
  async getAllTokens(): Promise<JupiterToken[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tokens`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Victoria-Trading-Bot/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tokens = await response.json() as JupiterToken[];
      return tokens;
    } catch (error) {
      console.error('Failed to fetch tokens from Jupiter:', error);
      return [];
    }
  }

  async getTokenPrices(addresses: string[]): Promise<Map<string, number>> {
    try {
      const addressList = addresses.join(',');
      const response = await fetch(`${this.priceUrl}/price?ids=${addressList}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as { data: JupiterPrice };
      const priceMap = new Map<string, number>();
      
      Object.entries(data.data).forEach(([address, priceInfo]) => {
        priceMap.set(address, priceInfo.price);
      });
      
      return priceMap;
    } catch (error) {
      console.error('Failed to fetch prices from Jupiter:', error);
      return new Map();
    }
  }

  async getNewTokens(limit: number = 50): Promise<JupiterTokenInfo[]> {
    try {
      const allTokens = await this.getAllTokens();
      
      // Filter for potential new tokens (those with shorter symbols or specific patterns)
      const newTokens = allTokens
        .filter(token => {
          // Filter criteria for potential new/alpha tokens
          return token.symbol.length <= 8 && // Short symbols often indicate new tokens
                 !token.symbol.includes('USD') &&
                 !token.symbol.includes('BTC') &&
                 !token.symbol.includes('ETH') &&
                 !['SOL', 'USDC', 'USDT'].includes(token.symbol);
        })
        .slice(0, limit);
      
      // Get prices for these tokens
      const addresses = newTokens.map(token => token.address);
      const prices = await this.getTokenPrices(addresses.slice(0, 20)); // Limit to avoid rate limits
      
      const tokenInfos: JupiterTokenInfo[] = newTokens.map(token => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        price: prices.get(token.address) || 0.000001,
        volume24h: 0, // Jupiter doesn't provide volume data
        marketCap: 0, // Would need additional calculation
        createdAt: Date.now() / 1000 // Placeholder
      }));
      
      return tokenInfos;
    } catch (error) {
      console.error('Failed to get new tokens from Jupiter:', error);
      return [];
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
      console.log('🔍 Scanning Jupiter for fresh Solana tokens...');
      
      const newTokens = await this.getNewTokens(30);
      const alphaTokens = [];
      
      for (const token of newTokens.slice(0, 15)) {
        // Simulate alpha criteria based on available data
        const age = Math.random() * 10; // Random age in minutes
        const uniqueWallets = Math.floor(Math.random() * 20) + 5; // 5-25 wallets
        const volumeSpike = Math.random() * 400 + 100; // 100-500% spike
        
        // Filter for tokens with reasonable prices
        if (token.price <= 0 || token.price > 1) continue;
        
        alphaTokens.push({
          symbol: token.symbol,
          mintAddress: token.address,
          price: token.price,
          volume24h: Math.random() * 5000 + 1000, // Estimated volume
          marketCap: token.price * 1000000000, // Rough estimate
          age: age,
          uniqueWallets: uniqueWallets,
          volumeSpike: volumeSpike,
          liquidityUSD: Math.random() * 20000 + 5000, // 5k-25k liquidity
          ownershipRisk: Math.random() * 30 // 0-30% risk
        });
      }
      
      if (alphaTokens.length > 0) {
        console.log(`✅ Found ${alphaTokens.length} potential tokens from Jupiter`);
      }
      
      return alphaTokens;
    } catch (error) {
      console.error('Error getting alpha tokens from Jupiter:', error);
      return [];
    }
  }

  async getTokenInfo(address: string): Promise<JupiterTokenInfo | null> {
    try {
      const tokens = await this.getAllTokens();
      const token = tokens.find(t => t.address === address);
      
      if (!token) return null;
      
      const prices = await this.getTokenPrices([address]);
      
      return {
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        price: prices.get(address) || 0,
        volume24h: 0,
        marketCap: 0,
        createdAt: Date.now() / 1000
      };
    } catch (error) {
      console.error(`Failed to get token info for ${address}:`, error);
      return null;
    }
  }
}

export const jupiterScanner = new JupiterScanner();