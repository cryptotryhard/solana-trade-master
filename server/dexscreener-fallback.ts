/**
 * DEXSCREENER FALLBACK PRICING SERVICE
 * High-performance fallback when Birdeye API fails
 */

export class DexScreenerFallback {
  private baseUrl = 'https://api.dexscreener.com/latest/dex';

  async getTokenPrices(tokenMints: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    
    try {
      // SOL price
      priceMap.set('So11111111111111111111111111111111111111112', 146.25);
      
      // Filter out SOL and limit to 30 tokens (DexScreener batch limit)
      const filteredMints = tokenMints
        .filter(mint => mint !== 'So11111111111111111111111111111111111111112')
        .slice(0, 30);
      
      if (filteredMints.length === 0) {
        return priceMap;
      }
      
      const addressesParam = filteredMints.join(',');
      const response = await fetch(`${this.baseUrl}/tokens/${addressesParam}`, {
        headers: {
          'User-Agent': 'VICTORIA-Trading-Bot/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.pairs && Array.isArray(data.pairs)) {
        for (const pair of data.pairs) {
          if (pair.baseToken?.address && pair.priceUsd) {
            const price = parseFloat(pair.priceUsd);
            if (!isNaN(price) && price > 0) {
              priceMap.set(pair.baseToken.address, price);
            }
          }
        }
      }
      
      console.log(`✅ DexScreener: Fetched ${priceMap.size - 1} token prices`);
      return priceMap;
      
    } catch (error) {
      console.log(`❌ DexScreener fallback failed: ${error}`);
      throw error;
    }
  }

  async getTokenInfo(tokenMint: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/tokens/${tokenMint}`);
      
      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0];
        return {
          symbol: pair.baseToken?.symbol || 'UNKNOWN',
          name: pair.baseToken?.name || 'Unknown Token',
          price: parseFloat(pair.priceUsd) || 0,
          volume24h: parseFloat(pair.volume?.h24) || 0,
          priceChange24h: parseFloat(pair.priceChange?.h24) || 0,
          liquidity: parseFloat(pair.liquidity?.usd) || 0,
          marketCap: parseFloat(pair.marketCap) || 0
        };
      }
      
      return null;
      
    } catch (error) {
      console.log(`❌ DexScreener token info failed for ${tokenMint}: ${error}`);
      return null;
    }
  }

  async searchTokens(query: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search/?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`DexScreener search error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.pairs && Array.isArray(data.pairs)) {
        return data.pairs.slice(0, 10).map((pair: any) => ({
          mint: pair.baseToken?.address,
          symbol: pair.baseToken?.symbol,
          name: pair.baseToken?.name,
          price: parseFloat(pair.priceUsd) || 0,
          volume24h: parseFloat(pair.volume?.h24) || 0,
          priceChange24h: parseFloat(pair.priceChange?.h24) || 0,
          liquidity: parseFloat(pair.liquidity?.usd) || 0,
          marketCap: parseFloat(pair.marketCap) || 0
        }));
      }
      
      return [];
      
    } catch (error) {
      console.log(`❌ DexScreener search failed: ${error}`);
      return [];
    }
  }
}

export const dexScreenerFallback = new DexScreenerFallback();