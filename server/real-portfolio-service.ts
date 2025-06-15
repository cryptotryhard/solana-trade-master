import { Connection, PublicKey } from '@solana/web3.js';
import { dexScreenerFallback } from './dexscreener-fallback';
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
  private connections: Connection[];
  private currentConnectionIndex: number;
  private walletAddress: string;

  constructor() {
    // Use multiple RPC endpoints for reliability
    const rpcEndpoints = [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || ''}`,
      'https://rpc.ankr.com/solana'
    ];
    
    this.connections = rpcEndpoints.map(endpoint => new Connection(endpoint, 'confirmed'));
    this.currentConnectionIndex = 0;
    this.walletAddress = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
  }

  private getNextConnection(): Connection {
    this.currentConnectionIndex = (this.currentConnectionIndex + 1) % this.connections.length;
    return this.connections[this.currentConnectionIndex];
  }

  private async executeWithFallback<T>(operation: (connection: Connection) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    // Try each connection once
    for (let i = 0; i < this.connections.length; i++) {
      try {
        const connection = this.connections[(this.currentConnectionIndex + i) % this.connections.length];
        return await operation(connection);
      } catch (error) {
        lastError = error as Error;
        console.log(`RPC ${i + 1} failed, trying next...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay between attempts
      }
    }
    
    throw lastError || new Error('All RPC endpoints failed');
  }

  async getPortfolioValue(): Promise<PortfolioValue> {
    try {
      console.log('🔍 Fetching authentic wallet data from blockchain...');
      
      // Fetch real token accounts from wallet
      const realTokenAccounts = await this.getRealTokenAccountsWithRetry();
      console.log(`📊 Found ${realTokenAccounts.length} token accounts on-chain`);

      if (realTokenAccounts.length === 0) {
        throw new Error('No token accounts found - wallet may be empty or RPC issues');
      }

      // Get real-time prices for all tokens
      const tokenMints = realTokenAccounts.map((t: any) => t.mint);
      const realPrices = await this.getRealTimePricesWithRetry(tokenMints);
      
      // Calculate portfolio value using real blockchain data
      const tokens: WalletToken[] = realTokenAccounts
        .map((token: any) => {
          const priceData = realPrices[token.mint];
          if (!priceData) {
            console.warn(`⚠️ No price data for ${token.mint}`);
            return null;
          }
          
          const valueUSD = (token.balance / Math.pow(10, token.decimals)) * priceData.price;
          
          return {
            mint: token.mint,
            symbol: priceData.symbol,
            balance: token.balance / Math.pow(10, token.decimals),
            decimals: token.decimals,
            valueUSD
          };
        })
        .filter((token): token is WalletToken => token !== null);

      // Add real SOL balance
      const realSOLBalance = await this.getRealSOLBalanceWithRetry();
      const solPrice = await this.getRealSOLPriceWithRetry();
      const solValueUSD = (realSOLBalance / 1e9) * solPrice;
      
      tokens.push({
        mint: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        balance: realSOLBalance / 1e9,
        decimals: 9,
        valueUSD: solValueUSD
      });

      const totalValueUSD = tokens.reduce((sum, token) => sum + token.valueUSD, 0);

      console.log(`💰 Real portfolio value: $${totalValueUSD.toFixed(2)}`);
      console.log(`📊 Verified holdings: ${tokens.map(t => `${t.symbol}: $${t.valueUSD.toFixed(2)}`).join(', ')}`);

      return {
        totalValueUSD,
        lastUpdated: Date.now(),
        tokens: tokens.filter(t => t.valueUSD > 0.01)
      };

    } catch (error) {
      console.error('❌ Error fetching real portfolio:', error);
      throw new Error(`Real portfolio fetch failed: ${(error as Error).message}`);
    }
  }



  private getKnownSymbol(mint: string): string {
    const symbolMap: { [key: string]: string } = {
      'DezXAZ8z7PnrnRJjz3xXRDFhC3TUDrwOXKmjjEEqh5KS': 'BONK',
      '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU': 'SAMO',
      '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'POPCAT'
    };
    return symbolMap[mint] || 'Unknown';
  }

  private async getTokenAccounts() {
    try {
      const publicKey = new PublicKey(this.walletAddress);
      
      const tokenAccounts = await this.executeWithFallback(async (connection) => {
        return await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        });
      });

      console.log(`📊 Found ${tokenAccounts.value.length} token accounts`);
      
      return tokenAccounts.value
        .map(account => ({
          mint: account.account.data.parsed.info.mint,
          balance: parseInt(account.account.data.parsed.info.tokenAmount.amount),
          decimals: account.account.data.parsed.info.tokenAmount.decimals
        }))
        .filter(token => token.balance > 0);
    } catch (error) {
      console.error('❌ Error fetching token accounts:', error);
      throw new Error('Unable to fetch token accounts from blockchain');
    }
  }

  private async getRealTokenAccountsWithRetry(maxRetries = 5): Promise<any[]> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const connection = this.getNextConnection();
        const publicKey = new PublicKey(this.walletAddress);
        
        console.log(`🔍 Attempt ${i + 1}: Fetching token accounts from blockchain...`);
        
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        });

        const validTokens = tokenAccounts.value
          .filter(account => {
            const tokenAmount = account.account.data.parsed.info.tokenAmount;
            return parseFloat(tokenAmount.amount) > 0;
          })
          .map(account => {
            const tokenAmount = account.account.data.parsed.info.tokenAmount;
            return {
              mint: account.account.data.parsed.info.mint,
              balance: parseFloat(tokenAmount.amount),
              decimals: tokenAmount.decimals
            };
          });

        console.log(`✅ Successfully fetched ${validTokens.length} token accounts`);
        return validTokens;

      } catch (error) {
        console.log(`❌ Attempt ${i + 1} failed:`, (error as Error).message);
        if (i === maxRetries - 1) {
          throw new Error(`Failed to fetch token accounts after ${maxRetries} attempts: ${(error as Error).message}`);
        }
        
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return [];
  }

  private async getRealTimePricesWithRetry(mints: string[], maxRetries = 3): Promise<TokenPrice> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔍 Attempt ${i + 1}: Fetching real-time prices from Birdeye for ${mints.length} tokens...`);
        
        const prices: TokenPrice = {};
        
        // Use Birdeye API with actual API key
        for (const mint of mints) {
          try {
            const response = await fetch(`https://public-api.birdeye.so/defi/price?address=${mint}`, {
              headers: { 
                'X-API-KEY': process.env.BIRDEYE_API_KEY || '81357058bdf84d0f9ad7c90537750b20',
                'User-Agent': 'VICTORIA/1.0'
              }
            });
            
            if (response.ok) {
              const data: any = await response.json();
              const price = data.data?.value || 0;
              
              if (price > 0) {
                prices[mint] = {
                  price,
                  symbol: this.getTokenSymbolFromMint(mint)
                };
                console.log(`✅ Birdeye: ${this.getTokenSymbolFromMint(mint)} = $${price}`);
              }
            } else {
              console.log(`⚠️ Birdeye API error for ${mint}: ${response.status}`);
            }
          } catch (error) {
            console.log(`❌ Birdeye failed for ${mint}:`, (error as Error).message);
          }
        }
        
        if (Object.keys(prices).length > 0) {
          console.log(`✅ Birdeye API: Got prices for ${Object.keys(prices).length}/${mints.length} tokens`);
          return prices;
        }

      } catch (error) {
        console.log(`❌ Price fetch attempt ${i + 1} failed:`, (error as Error).message);
        if (i === maxRetries - 1) {
          throw new Error(`Failed to fetch authentic prices from Birdeye after ${maxRetries} attempts`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      }
    }
    
    // Fallback to DexScreener when Birdeye fails
    console.log('🔄 Birdeye failed, falling back to DexScreener...');
    try {
      const tokenMints = Object.keys(this.cachedPrices);
      const dexScreenerPrices = await dexScreenerFallback.getTokenPrices(tokenMints);
      
      const prices: { [mint: string]: number } = {};
      dexScreenerPrices.forEach((price, mint) => {
        prices[mint] = price;
      });
      
      if (Object.keys(prices).length > 0) {
        console.log(`✅ DexScreener fallback: Got ${Object.keys(prices).length} prices`);
        return prices;
      }
    } catch (fallbackError) {
      console.log(`❌ DexScreener fallback also failed: ${fallbackError}`);
    }
    
    throw new Error('Both Birdeye and DexScreener APIs are currently unavailable');
  }

  private async getRealSOLBalanceWithRetry(maxRetries = 3): Promise<number> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const connection = this.getNextConnection();
        const balance = await connection.getBalance(new PublicKey(this.walletAddress));
        console.log(`✅ SOL balance: ${balance / 1e9} SOL`);
        return balance;
      } catch (error) {
        console.log(`❌ SOL balance fetch attempt ${i + 1} failed:`, (error as Error).message);
        if (i === maxRetries - 1) {
          throw new Error(`Failed to fetch SOL balance after ${maxRetries} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    return 0;
  }

  private async getRealSOLPriceWithRetry(maxRetries = 3): Promise<number> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch('https://public-api.birdeye.so/defi/price?address=So11111111111111111111111111111111111111112', {
          headers: { 
            'X-API-KEY': process.env.BIRDEYE_API_KEY || '81357058bdf84d0f9ad7c90537750b20',
            'User-Agent': 'VICTORIA/1.0'
          }
        });
        
        if (response.ok) {
          const data: any = await response.json();
          const price = data.data?.value || 0;
          if (price > 0) {
            console.log(`✅ Birdeye SOL price: $${price}`);
            return price;
          }
        }
      } catch (error) {
        console.log(`❌ SOL price fetch attempt ${i + 1} failed:`, (error as Error).message);
        if (i === maxRetries - 1) {
          throw new Error(`Failed to fetch SOL price from Birdeye after ${maxRetries} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Birdeye SOL price unavailable');
  }

  private getTokenSymbolFromMint(mint: string): string {
    const knownTokens: { [key: string]: string } = {
      'DezXAZ8z7PnrnRJjz3xXRDFhC3TUDrwOXKmjjEEqh5KS': 'BONK',
      '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU': 'SAMO',
      '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'POPCAT',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT'
    };
    return knownTokens[mint] || 'UNKNOWN';
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