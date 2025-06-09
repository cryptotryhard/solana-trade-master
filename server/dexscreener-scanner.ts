import fetch from 'node-fetch';

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd?: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[];
}

class DexScreenerScanner {
  private baseUrl = 'https://api.dexscreener.com/latest/dex';
  
  async getNewPairs(chain: string = 'solana'): Promise<DexScreenerPair[]> {
    try {
      // Use search endpoint with filter for recent Solana pairs
      const response = await fetch(`${this.baseUrl}/search/?q=${chain}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as DexScreenerResponse;
      
      // Filter for Solana pairs only
      const solanaPairs = data.pairs?.filter(pair => pair.chainId === 'solana') || [];
      
      // Sort by creation time (newest first) if available
      return solanaPairs.sort((a, b) => {
        const timeA = a.pairCreatedAt || 0;
        const timeB = b.pairCreatedAt || 0;
        return timeB - timeA;
      }).slice(0, 50);
      
    } catch (error) {
      console.error('Failed to fetch pairs from DexScreener:', error);
      return [];
    }
  }

  async searchPairs(query: string): Promise<DexScreenerPair[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search/?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as DexScreenerResponse;
      return data.pairs || [];
    } catch (error) {
      console.error('Failed to search pairs on DexScreener:', error);
      return [];
    }
  }

  async getTokensByMarketCap(): Promise<DexScreenerPair[]> {
    try {
      const response = await fetch(`${this.baseUrl}/pairs/solana?limit=100`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as DexScreenerResponse;
      
      // Filter and sort by market cap and activity
      return data.pairs
        .filter(pair => pair.marketCap && pair.marketCap > 10000) // Min $10k market cap
        .sort((a, b) => (b.volume.h1 || 0) - (a.volume.h1 || 0))
        .slice(0, 50);
    } catch (error) {
      console.error('Failed to fetch tokens by market cap:', error);
      return [];
    }
  }

  calculateTokenAge(pairCreatedAt?: number): number {
    if (!pairCreatedAt) return 999;
    const now = Date.now();
    const ageMs = now - (pairCreatedAt * 1000);
    return ageMs / (1000 * 60); // Return age in minutes
  }

  calculateVolumeSpike(volume: DexScreenerPair['volume']): number {
    if (!volume.h1 || !volume.h6) return 0;
    
    const recentVolume = volume.h1;
    const olderVolume = volume.h6 - volume.h1; // Previous 5 hours
    
    if (olderVolume <= 0) return recentVolume > 0 ? 500 : 0;
    
    return ((recentVolume - olderVolume) / olderVolume) * 100;
  }

  countUniqueWallets(txns: DexScreenerPair['txns']): number {
    // Estimate unique wallets from transaction count
    const totalTxns = (txns.h1?.buys || 0) + (txns.h1?.sells || 0);
    return Math.floor(totalTxns * 0.7); // Rough estimate: 70% unique wallets
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
      console.log('🔍 Scanning DexScreener for fresh Solana pairs...');
      
      const pairs = await this.getNewPairs('solana');
      const alphaTokens = [];
      
      for (const pair of pairs.slice(0, 20)) { // Analyze top 20 pairs
        const age = this.calculateTokenAge(pair.pairCreatedAt);
        
        // Filter for ultra-fresh pairs with good metrics
        if (age > 15) continue; // Less than 15 minutes old
        if (!pair.volume.h1 || pair.volume.h1 < 1000) continue; // Min $1k hourly volume
        if (!pair.liquidity?.usd || pair.liquidity.usd < 5000) continue; // Min $5k liquidity
        
        const uniqueWallets = this.countUniqueWallets(pair.txns);
        const volumeSpike = this.calculateVolumeSpike(pair.volume);
        
        // Skip if insufficient activity
        if (uniqueWallets < 5) continue;
        
        alphaTokens.push({
          symbol: pair.baseToken.symbol,
          mintAddress: pair.baseToken.address,
          price: parseFloat(pair.priceUsd || pair.priceNative || '0'),
          volume24h: pair.volume.h24 || 0,
          marketCap: pair.marketCap || pair.fdv || 0,
          age: age,
          uniqueWallets: uniqueWallets,
          volumeSpike: Math.max(0, volumeSpike),
          liquidityUSD: pair.liquidity?.usd || 0,
          ownershipRisk: 0 // DexScreener doesn't provide ownership data
        });
      }
      
      if (alphaTokens.length > 0) {
        console.log(`✅ Found ${alphaTokens.length} fresh pairs from DexScreener`);
      }
      
      return alphaTokens;
    } catch (error) {
      console.error('Error getting alpha tokens from DexScreener:', error);
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
      const pairs = await this.getTokensByMarketCap();
      const trending = [];
      
      for (const pair of pairs.slice(0, 10)) {
        if (!pair.priceChange.h24 || pair.priceChange.h24 < 50) continue; // Min 50% gain
        
        trending.push({
          symbol: pair.baseToken.symbol,
          mintAddress: pair.baseToken.address,
          price: parseFloat(pair.priceUsd || pair.priceNative || '0'),
          volume24h: pair.volume.h24 || 0,
          marketCap: pair.marketCap || 0,
          priceChange24h: pair.priceChange.h24 || 0,
          liquidityUSD: pair.liquidity?.usd || 0
        });
      }
      
      return trending;
    } catch (error) {
      console.error('Error getting trending tokens:', error);
      return [];
    }
  }
}

export const dexScreenerScanner = new DexScreenerScanner();