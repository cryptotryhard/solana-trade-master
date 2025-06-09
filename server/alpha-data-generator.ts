// Synthetic alpha token generator for development and testing
class AlphaDataGenerator {
  private tokenTemplates = [
    { symbol: 'MOONX', name: 'MoonX Protocol' },
    { symbol: 'ALPHADOG', name: 'Alpha Dog Finance' },
    { symbol: 'ROCKETAI', name: 'Rocket AI Token' },
    { symbol: 'GIGAMEME', name: 'Giga Meme Coin' },
    { symbol: 'SOLBEAST', name: 'Solana Beast' },
    { symbol: 'HYPERNET', name: 'Hyper Network' },
    { symbol: 'QUANTUMAI', name: 'Quantum AI' },
    { symbol: 'BLAZEFI', name: 'Blaze Finance' },
    { symbol: 'TRENDX', name: 'Trend Protocol X' },
    { symbol: 'VOLTAI', name: 'Volt AI Systems' },
    { symbol: 'MEGASWAP', name: 'Mega Swap Token' },
    { symbol: 'NEURALNET', name: 'Neural Network Coin' },
    { symbol: 'FUSIONX', name: 'Fusion Protocol X' },
    { symbol: 'SMARTAI', name: 'Smart AI Network' },
    { symbol: 'VIRALCOIN', name: 'Viral Coin Protocol' }
  ];

  private usedTokens = new Set<string>();
  private tokenCounter = 0;

  generateMintAddress(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateRealisticMetrics() {
    // Generate realistic trading metrics
    const basePrice = Math.random() * 0.001 + 0.000001; // $0.000001 - $0.001
    const age = Math.random() * 8 + 1; // 1-9 minutes old
    const uniqueWallets = Math.floor(Math.random() * 25) + 8; // 8-33 wallets
    const volumeSpike = Math.random() * 600 + 200; // 200-800% spike
    const volume24h = Math.random() * 8000 + 2000; // $2k-10k volume
    const liquidityUSD = Math.random() * 25000 + 8000; // $8k-33k liquidity
    const marketCap = basePrice * (Math.random() * 500000000 + 100000000); // Variable market cap
    const ownershipRisk = Math.random() * 25; // 0-25% ownership risk

    return {
      price: basePrice,
      age,
      uniqueWallets,
      volumeSpike,
      volume24h,
      liquidityUSD,
      marketCap,
      ownershipRisk
    };
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
      console.log('🔍 Generating synthetic alpha opportunities...');
      
      const alphaTokens = [];
      const numTokens = Math.floor(Math.random() * 4) + 2; // 2-5 tokens per scan
      
      for (let i = 0; i < numTokens; i++) {
        // Select a template that hasn't been used recently
        let template;
        let attempts = 0;
        do {
          template = this.tokenTemplates[Math.floor(Math.random() * this.tokenTemplates.length)];
          attempts++;
        } while (this.usedTokens.has(template.symbol) && attempts < 10);
        
        // Add variation to symbol to create unique instances
        const symbolVariation = this.tokenCounter > 0 ? `${template.symbol}${this.tokenCounter}` : template.symbol;
        this.usedTokens.add(symbolVariation);
        this.tokenCounter++;
        
        // Clean up used tokens set periodically
        if (this.usedTokens.size > 20) {
          this.usedTokens.clear();
          this.tokenCounter = 0;
        }
        
        const metrics = this.generateRealisticMetrics();
        
        alphaTokens.push({
          symbol: symbolVariation,
          mintAddress: this.generateMintAddress(),
          price: metrics.price,
          volume24h: metrics.volume24h,
          marketCap: metrics.marketCap,
          age: metrics.age,
          uniqueWallets: metrics.uniqueWallets,
          volumeSpike: metrics.volumeSpike,
          liquidityUSD: metrics.liquidityUSD,
          ownershipRisk: metrics.ownershipRisk
        });
      }
      
      if (alphaTokens.length > 0) {
        console.log(`✅ Generated ${alphaTokens.length} synthetic alpha opportunities`);
      }
      
      return alphaTokens;
    } catch (error) {
      console.error('Error generating alpha tokens:', error);
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
      const trending = [];
      const numTrending = Math.floor(Math.random() * 3) + 2; // 2-4 trending tokens
      
      for (let i = 0; i < numTrending; i++) {
        const template = this.tokenTemplates[Math.floor(Math.random() * this.tokenTemplates.length)];
        const metrics = this.generateRealisticMetrics();
        
        trending.push({
          symbol: `${template.symbol}T${i}`,
          mintAddress: this.generateMintAddress(),
          price: metrics.price,
          volume24h: metrics.volume24h,
          marketCap: metrics.marketCap,
          priceChange24h: Math.random() * 300 + 50, // 50-350% gain
          liquidityUSD: metrics.liquidityUSD
        });
      }
      
      return trending;
    } catch (error) {
      console.error('Error generating trending tokens:', error);
      return [];
    }
  }
}

export const alphaDataGenerator = new AlphaDataGenerator();