import { Connection, PublicKey } from '@solana/web3.js';
import fetch from 'node-fetch';

interface RealTokenHolding {
  symbol: string;
  mintAddress: string;
  balance: number;
  valueUSD: number;
  priceUSD: number;
}

interface RealPortfolioData {
  totalValueUSD: number;
  solBalance: number;
  solValueUSD: number;
  tokenHoldings: RealTokenHolding[];
  lastUpdated: Date;
}

interface RealTradeRecord {
  id: string;
  timestamp: Date;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  priceUSD: number;
  totalUSD: number;
  txHash?: string;
  pnlUSD?: number;
}

class RealPortfolioTracker {
  private connection: Connection;
  private realTrades: RealTradeRecord[] = [];
  private readonly STARTING_CAPITAL = 500; // Real starting amount

  private rpcEndpoints = [
    'https://rpc.heliohost.org',
    'https://rpc.ankr.com/solana', 
    'https://solana-mainnet.rpc.extrnode.com',
    'https://api.mainnet-beta.solana.com',
    'https://solana.public-rpc.com'
  ];
  private currentEndpointIndex = 0;

  constructor() {
    this.connection = new Connection(this.rpcEndpoints[0]);
  }

  private async switchToNextEndpoint(): Promise<void> {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length;
    this.connection = new Connection(this.rpcEndpoints[this.currentEndpointIndex]);
    console.log(`🔄 Switched to RPC: ${this.rpcEndpoints[this.currentEndpointIndex]}`);
  }

  private async retryWithFallback<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt < maxRetries - 1) {
          console.log(`⚠️ RPC attempt ${attempt + 1} failed, switching endpoint`);
          await this.switchToNextEndpoint();
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        } else {
          throw error;
        }
      }
    }
    throw new Error('All RPC endpoints failed');
  }

  async getRealWalletData(walletAddress: string): Promise<RealPortfolioData> {
    try {
      const wallet = new PublicKey(walletAddress);
      
      // Get SOL balance with retry fallback
      const solBalance = await this.retryWithFallback(async () => {
        return await this.connection.getBalance(wallet);
      });
      const solInTokens = solBalance / 1e9;
      
      // Get SOL price with proper error handling
      let solPrice = 164.50; // Current SOL price fallback
      try {
        const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        if (solPriceResponse.ok) {
          const solPriceData = await solPriceResponse.json() as any;
          solPrice = solPriceData.solana?.usd || solPrice;
        }
      } catch (error) {
        console.log('Using fallback SOL price due to API error');
      }
      const solValueUSD = solInTokens * solPrice;

      // Get token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(wallet, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      });

      const tokenHoldings: RealTokenHolding[] = [];
      let totalTokenValue = 0;

      for (const account of tokenAccounts.value) {
        const accountData = account.account.data.parsed;
        if (accountData.type === 'account') {
          const info = accountData.info;
          const balance = parseFloat(info.tokenAmount.amount) / Math.pow(10, info.tokenAmount.decimals);
          
          if (balance > 0) {
            const mintAddress = info.mint;
            
            // Get token price and symbol
            const tokenPrice = await this.getTokenPrice(mintAddress);
            const tokenSymbol = await this.getTokenSymbol(mintAddress);
            const tokenValue = balance * tokenPrice;
            
            if (tokenValue > 0.01) { // Only track tokens worth more than 1 cent
              tokenHoldings.push({
                symbol: tokenSymbol,
                mintAddress,
                balance,
                priceUSD: tokenPrice,
                valueUSD: tokenValue
              });
              totalTokenValue += tokenValue;
            }
          }
        }
      }

      return {
        totalValueUSD: solValueUSD + totalTokenValue,
        solBalance: solInTokens,
        solValueUSD,
        tokenHoldings,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error fetching real wallet data:', error);
      return {
        totalValueUSD: 0,
        solBalance: 0,
        solValueUSD: 0,
        tokenHoldings: [],
        lastUpdated: new Date()
      };
    }
  }

  private async getTokenPrice(mintAddress: string): Promise<number> {
    try {
      // Try multiple price sources
      const sources = [
        `https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${mintAddress}&vs_currencies=usd`,
        `https://price.jup.ag/v4/price?ids=${mintAddress}`
      ];

      for (const source of sources) {
        try {
          const response = await fetch(source);
          if (response.ok) {
            const data = await response.json();
            
            if (source.includes('coingecko')) {
              return data[mintAddress.toLowerCase()]?.usd || 0;
            } else if (source.includes('jup.ag')) {
              return data.data?.[mintAddress]?.price || 0;
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private async getTokenSymbol(mintAddress: string): Promise<string> {
    // Common token mappings
    const knownTokens: { [key: string]: string } = {
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC'
    };

    return knownTokens[mintAddress] || mintAddress.slice(0, 8);
  }

  recordRealTrade(trade: Omit<RealTradeRecord, 'id'>): void {
    const realTrade: RealTradeRecord = {
      id: `real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...trade
    };
    
    this.realTrades.push(realTrade);
    
    // Keep only last 1000 trades
    if (this.realTrades.length > 1000) {
      this.realTrades = this.realTrades.slice(-1000);
    }
  }

  getRealTrades(limit: number = 50): RealTradeRecord[] {
    return this.realTrades.slice(-limit).reverse();
  }

  calculateRealPnL(currentValue: number): {
    totalPnL: number;
    percentageGain: number;
    realizedPnL: number;
    unrealizedPnL: number;
  } {
    const totalTradeValue = this.realTrades.reduce((sum, trade) => {
      return sum + (trade.pnlUSD || 0);
    }, 0);

    const totalPnL = currentValue - this.STARTING_CAPITAL;
    const percentageGain = (totalPnL / this.STARTING_CAPITAL) * 100;

    return {
      totalPnL,
      percentageGain,
      realizedPnL: totalTradeValue,
      unrealizedPnL: totalPnL - totalTradeValue
    };
  }

  getRealMetrics(): {
    startingCapital: number;
    totalTrades: number;
    winningTrades: number;
    winRate: number;
    totalVolume: number;
  } {
    const winningTrades = this.realTrades.filter(t => (t.pnlUSD || 0) > 0).length;
    const totalVolume = this.realTrades.reduce((sum, t) => sum + Math.abs(t.totalUSD), 0);

    return {
      startingCapital: this.STARTING_CAPITAL,
      totalTrades: this.realTrades.length,
      winningTrades,
      winRate: this.realTrades.length > 0 ? (winningTrades / this.realTrades.length) * 100 : 0,
      totalVolume
    };
  }

  async getPortfolioData(walletAddress: string): Promise<RealPortfolioData> {
    return await this.getRealWalletData(walletAddress);
  }

  async getPerformanceMetrics(): Promise<any> {
    return this.getRealMetrics();
  }
}

export const realPortfolioTracker = new RealPortfolioTracker();