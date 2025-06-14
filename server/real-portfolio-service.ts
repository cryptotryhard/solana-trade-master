import { Connection, PublicKey } from '@solana/web3.js';
import fetch from 'node-fetch';

interface TokenPrice {
  [mint: string]: {
    price: number;
    symbol: string;
  };
}

interface WalletToken {
  mint: string;
  symbol: string;
  balance: number;
  decimals: number;
  valueUSD: number;
}

interface PortfolioValue {
  totalValueUSD: number;
  lastUpdated: number;
  tokens: WalletToken[];
}

export class RealPortfolioService {
  private connection: Connection;
  private walletAddress: string;

  constructor() {
    // Use multiple RPC endpoints for reliability
    const rpcEndpoints = [
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com'
    ];
    
    this.connection = new Connection(rpcEndpoints[0], 'confirmed');
    this.walletAddress = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
  }

  async getPortfolioValue(): Promise<PortfolioValue> {
    try {
      console.log('🔍 Fetching real portfolio data...');
      
      // Get all token accounts for the wallet
      const tokenAccounts = await this.getTokenAccounts();
      console.log(`📊 Found ${tokenAccounts.length} token accounts`);

      // Get current prices for all tokens
      const prices = await this.getTokenPrices(tokenAccounts.map(t => t.mint));
      
      // Calculate portfolio value
      const tokens: WalletToken[] = tokenAccounts.map(token => {
        const price = prices[token.mint]?.price || 0;
        const symbol = prices[token.mint]?.symbol || 'Unknown';
        const valueUSD = (token.balance / Math.pow(10, token.decimals)) * price;
        
        return {
          mint: token.mint,
          symbol,
          balance: token.balance / Math.pow(10, token.decimals),
          decimals: token.decimals,
          valueUSD
        };
      });

      // Add SOL balance
      const solBalance = await this.connection.getBalance(new PublicKey(this.walletAddress));
      const solPrice = await this.getSOLPrice();
      const solValueUSD = (solBalance / 1e9) * solPrice;
      
      tokens.push({
        mint: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        balance: solBalance / 1e9,
        decimals: 9,
        valueUSD: solValueUSD
      });

      const totalValueUSD = tokens.reduce((sum, token) => sum + token.valueUSD, 0);

      console.log(`💰 Total portfolio value: $${totalValueUSD.toFixed(2)}`);

      return {
        totalValueUSD,
        lastUpdated: Date.now(),
        tokens: tokens.filter(t => t.valueUSD > 0.01) // Only show tokens worth more than 1 cent
      };

    } catch (error) {
      console.error('❌ Error fetching portfolio:', error);
      throw new Error(`Portfolio fetch failed: ${error.message}`);
    }
  }

  private async getTokenAccounts() {
    const publicKey = new PublicKey(this.walletAddress);
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });

    return tokenAccounts.value
      .map(account => ({
        mint: account.account.data.parsed.info.mint,
        balance: parseInt(account.account.data.parsed.info.tokenAmount.amount),
        decimals: account.account.data.parsed.info.tokenAmount.decimals
      }))
      .filter(token => token.balance > 0);
  }

  private async getTokenPrices(mints: string[]): Promise<TokenPrice> {
    try {
      // Try Jupiter API first
      const response = await fetch('https://price.jup.ag/v4/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: mints })
      });

      if (response.ok) {
        const data = await response.json();
        const prices: TokenPrice = {};
        
        for (const [mint, priceData] of Object.entries(data.data as any)) {
          prices[mint] = {
            price: priceData.price,
            symbol: priceData.symbol || 'Unknown'
          };
        }
        
        return prices;
      }
    } catch (error) {
      console.log('Jupiter API failed, trying Birdeye...');
    }

    // Fallback to Birdeye API
    try {
      const prices: TokenPrice = {};
      
      for (const mint of mints) {
        const response = await fetch(`https://public-api.birdeye.so/defi/price?address=${mint}`, {
          headers: { 'X-API-KEY': process.env.BIRDEYE_API_KEY || '' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            prices[mint] = {
              price: data.data.value,
              symbol: data.data.symbol || 'Unknown'
            };
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      return prices;
    } catch (error) {
      console.error('❌ All price APIs failed:', error);
      return {};
    }
  }

  private async getSOLPrice(): Promise<number> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana?.usd || 0;
    } catch (error) {
      console.error('❌ Failed to get SOL price:', error);
      return 0;
    }
  }
}