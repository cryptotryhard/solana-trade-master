import fetch from 'node-fetch';

interface BirdeyeToken {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  logoURI?: string;
  extensions?: {
    coingeckoId?: string;
  };
}

interface BirdeyeTokenData {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  lastTradeUnixTime: number;
  uniqueWallet24h: number;
}

interface BirdeyeTokenList {
  success: boolean;
  data: {
    tokens: BirdeyeToken[];
  };
}

interface BirdeyePriceData {
  success: boolean;
  data: {
    [address: string]: {
      value: number;
      updateUnixTime: number;
      updateHumanTime: string;
      priceChange24h: number;
    };
  };
}

class BirdeyeScanner {
  private baseUrl = 'https://public-api.birdeye.so';
  
  async getNewTokens(limit: number = 50): Promise<BirdeyeToken[]> {
    try {
      const response = await fetch(`${this.baseUrl}/defi/tokenlist?sort_by=created_time&sort_type=desc&offset=0&limit=${limit}`, {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': process.env.BIRDEYE_API_KEY || 'public'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as BirdeyeTokenList;
      return data.success ? data.data.tokens : [];
    } catch (error) {
      console.error('Failed to fetch tokens from Birdeye:', error);
      return [];
    }
  }

  async getTokenPrices(addresses: string[]): Promise<Map<string, number>> {
    try {
      const addressList = addresses.join(',');
      const response = await fetch(`${this.baseUrl}/defi/price?list_address=${addressList}`, {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': process.env.BIRDEYE_API_KEY || 'public'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as BirdeyePriceData;
      const priceMap = new Map<string, number>();
      
      if (data.success) {
        Object.entries(data.data).forEach(([address, priceInfo]) => {
          priceMap.set(address, priceInfo.value);
        });
      }
      
      return priceMap;
    } catch (error) {
      console.error('Failed to fetch prices from Birdeye:', error);
      return new Map();
    }
  }

  async getTokenOverview(address: string): Promise<BirdeyeTokenData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/defi/token_overview?address=${address}`, {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': process.env.BIRDEYE_API_KEY || 'public'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error(`Failed to fetch overview for ${address}:`, error);
      return null;
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
      console.log('🔍 Scanning Birdeye for fresh Solana tokens...');
      
      const newTokens = await this.getNewTokens(30);
      const alphaTokens = [];
      
      for (const token of newTokens.slice(0, 15)) {
        try {
          const overview = await this.getTokenOverview(token.address);
          if (!overview) continue;
          
          // Calculate token age from last trade time
          const now = Date.now() / 1000;
          const age = (now - overview.lastTradeUnixTime) / 60; // minutes
          
          // Filter for ultra-fresh tokens with good metrics
          if (age > 20) continue; // Less than 20 minutes since last trade
          if (overview.volume24h < 500) continue; // Min $500 24h volume
          if (overview.liquidity < 3000) continue; // Min $3k liquidity
          if (overview.uniqueWallet24h < 3) continue; // Min 3 unique wallets
          
          // Estimate volume spike (simplified)
          const volumeSpike = overview.volume24h > 1000 ? 
            Math.min(500, (overview.volume24h / 1000) * 100) : 0;
          
          alphaTokens.push({
            symbol: token.symbol || 'UNKNOWN',
            mintAddress: token.address,
            price: overview.price || 0.000001,
            volume24h: overview.volume24h || 0,
            marketCap: overview.marketCap || 0,
            age: age,
            uniqueWallets: overview.uniqueWallet24h || 0,
            volumeSpike: volumeSpike,
            liquidityUSD: overview.liquidity || 0,
            ownershipRisk: 0 // Would need additional analysis
          });
          
          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (tokenError) {
          console.log(`Error processing token ${token.symbol}:`, tokenError);
          continue;
        }
      }
      
      if (alphaTokens.length > 0) {
        console.log(`✅ Found ${alphaTokens.length} fresh tokens from Birdeye`);
      }
      
      return alphaTokens;
    } catch (error) {
      console.error('Error getting alpha tokens from Birdeye:', error);
      return [];
    }
  }

  async getTrendingTokens(): Promise<Array<{
    symbol: string;
    mintAddress: string;
    price: number;
    volume24h: number;
    marketCap: number;
    priceChange24h: number;
    liquidityUSD: number;
  }>> {
    try {
      const tokens = await this.getNewTokens(20);
      const trending = [];
      
      for (const token of tokens.slice(0, 10)) {
        const overview = await this.getTokenOverview(token.address);
        if (!overview) continue;
        
        if (overview.priceChange24h < 30) continue; // Min 30% gain
        
        trending.push({
          symbol: token.symbol,
          mintAddress: token.address,
          price: overview.price,
          volume24h: overview.volume24h,
          marketCap: overview.marketCap,
          priceChange24h: overview.priceChange24h,
          liquidityUSD: overview.liquidity
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return trending;
    } catch (error) {
      console.error('Error getting trending tokens from Birdeye:', error);
      return [];
    }
  }
}

export const birdeyeScanner = new BirdeyeScanner();