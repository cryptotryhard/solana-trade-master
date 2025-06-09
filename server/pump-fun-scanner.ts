import fetch from 'node-fetch';

interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  twitter: string;
  telegram: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  created_timestamp: number;
  raydium_pool: string;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  hidden: boolean;
  total_supply: number;
  website: string;
  show_name: boolean;
  last_trade_timestamp: number;
  king_of_the_hill_timestamp: number;
  market_cap: number;
  reply_count: number;
  last_reply: number;
  nsfw: boolean;
  market_id: string;
  inverted: boolean;
  is_currently_live: boolean;
  username: string;
  profile_image: string;
  usd_market_cap: number;
}

interface TradeData {
  signature: string;
  mint: string;
  sol_amount: number;
  token_amount: number;
  is_buy: boolean;
  user: string;
  timestamp: number;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  market_cap_sol: number;
}

class PumpFunScanner {
  private baseUrl = 'https://frontend-api.pump.fun';
  private wsUrl = 'wss://pumpportal.fun/api/data';
  
  async getNewTokens(limit: number = 50): Promise<PumpFunToken[]> {
    // Try multiple pump.fun endpoints for maximum reliability
    const endpoints = [
      `https://frontend-api.pump.fun/coins?offset=0&limit=${limit}&sort=created_timestamp&order=DESC&includeNsfw=false`,
      `https://api.pump.fun/tokens?sort=new&limit=${limit}`,
      `https://pump.fun/api/coins?offset=0&limit=${limit}&sort=created_timestamp&order=DESC`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const headers: any = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://pump.fun/',
          'Origin': 'https://pump.fun'
        };
        
        // Add API key if available
        if (process.env.PUMP_FUN_API_KEY) {
          headers['Authorization'] = `Bearer ${process.env.PUMP_FUN_API_KEY}`;
        }
        
        const response = await fetch(endpoint, { 
          headers,
          method: 'GET'
        });
        
        if (!response.ok) {
          console.log(`Endpoint ${endpoint} failed with status: ${response.status}`);
          continue;
        }
        
        const data = await response.json() as PumpFunToken[];
        console.log(`✅ Successfully fetched ${data.length} tokens from pump.fun`);
        return data;
      } catch (error) {
        console.log(`Endpoint ${endpoint} error:`, error.message);
        continue;
      }
    }
    
    throw new Error('All pump.fun endpoints failed');
  }

  async getTokensByMarketCap(limit: number = 50): Promise<PumpFunToken[]> {
    try {
      const response = await fetch(`${this.baseUrl}/coins?offset=0&limit=${limit}&sort=market_cap&order=DESC&includeNsfw=false`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as PumpFunToken[];
      return data;
    } catch (error) {
      console.error('Failed to fetch tokens by market cap:', error);
      return [];
    }
  }

  async getTokenData(mintAddress: string): Promise<PumpFunToken | null> {
    try {
      const response = await fetch(`${this.baseUrl}/coins/${mintAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as PumpFunToken;
      return data;
    } catch (error) {
      console.error(`Failed to fetch token data for ${mintAddress}:`, error);
      return null;
    }
  }

  async getRecentTrades(mintAddress: string, limit: number = 100): Promise<TradeData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/trades/${mintAddress}?limit=${limit}&offset=0`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as TradeData[];
      return data;
    } catch (error) {
      console.error(`Failed to fetch trades for ${mintAddress}:`, error);
      return [];
    }
  }

  async searchTokens(query: string, limit: number = 20): Promise<PumpFunToken[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as PumpFunToken[];
      return data;
    } catch (error) {
      console.error(`Failed to search tokens:`, error);
      return [];
    }
  }

  calculateTokenAge(createdTimestamp: number): number {
    const now = Date.now();
    const ageMs = now - (createdTimestamp * 1000);
    return ageMs / (1000 * 60); // Return age in minutes
  }

  calculateVolumeSpike(trades: TradeData[]): number {
    if (trades.length < 2) return 0;
    
    const recentTrades = trades.slice(0, 10);
    const olderTrades = trades.slice(-10);
    
    const recentVolume = recentTrades.reduce((sum, trade) => sum + trade.sol_amount, 0);
    const olderVolume = olderTrades.reduce((sum, trade) => sum + trade.sol_amount, 0);
    
    if (olderVolume === 0) return recentVolume > 0 ? 1000 : 0;
    
    return ((recentVolume - olderVolume) / olderVolume) * 100;
  }

  countUniqueWallets(trades: TradeData[]): number {
    const uniqueWallets = new Set(trades.map(trade => trade.user));
    return uniqueWallets.size;
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
      const newTokens = await this.getNewTokens(20);
      const alphaTokens = [];
      
      for (const token of newTokens) {
        const age = this.calculateTokenAge(token.created_timestamp);
        
        // Filter for ultra-fresh tokens (< 5 minutes old)
        if (age > 5) continue;
        
        const trades = await this.getRecentTrades(token.mint, 50);
        const uniqueWallets = this.countUniqueWallets(trades);
        const volumeSpike = this.calculateVolumeSpike(trades);
        
        // Calculate approximate price from virtual reserves
        const price = token.virtual_sol_reserves / token.virtual_token_reserves;
        const volume24h = trades.reduce((sum, trade) => sum + trade.sol_amount, 0);
        
        alphaTokens.push({
          symbol: token.symbol,
          mintAddress: token.mint,
          price: price,
          volume24h: volume24h,
          marketCap: token.usd_market_cap,
          age: age,
          uniqueWallets: uniqueWallets,
          volumeSpike: volumeSpike,
          liquidityUSD: token.virtual_sol_reserves * 150, // Approximate SOL to USD
          ownershipRisk: 0 // Would need additional API for ownership distribution
        });
      }
      
      return alphaTokens;
    } catch (error) {
      console.error('Error getting alpha tokens:', error);
      return [];
    }
  }

  async getKingOfHillTokens(): Promise<PumpFunToken[]> {
    try {
      // Get tokens sorted by recent activity/hype
      const response = await fetch(`${this.baseUrl}/coins?offset=0&limit=10&sort=last_trade_timestamp&order=DESC&includeNsfw=false`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as PumpFunToken[];
      return data.filter(token => token.is_currently_live);
    } catch (error) {
      console.error('Failed to fetch king of hill tokens:', error);
      return [];
    }
  }
}

export const pumpFunScanner = new PumpFunScanner();