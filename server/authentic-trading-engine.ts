import { realBlockchainTrader } from './real-blockchain-trader';
import { realPortfolioService } from './real-portfolio-service';

interface RealToken {
  mint: string;
  symbol: string;
  balance: number;
  decimals: number;
  usdValue: number;
}

interface RealTrade {
  id: string;
  mint: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  amount: number;
  solAmount: number;
  txHash: string | null;
  timestamp: number;
  status: 'SUCCESS' | 'FAILED';
}

export class AuthenticTradingEngine {
  private targetWallet = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
  private realTrades: RealTrade[] = [];
  private isAuthenticated = false;

  constructor() {
    this.validateWalletConnection();
  }

  private async validateWalletConnection(): Promise<void> {
    try {
      const walletAddress = realBlockchainTrader.getWalletAddress();
      
      if (walletAddress !== this.targetWallet) {
        console.error(`❌ WALLET MISMATCH: Expected ${this.targetWallet}, got ${walletAddress}`);
        this.isAuthenticated = false;
        return;
      }

      const balance = await realBlockchainTrader.getSOLBalance();
      console.log(`✅ AUTHENTIC WALLET VERIFIED: ${walletAddress}`);
      console.log(`💰 Available SOL: ${balance}`);
      this.isAuthenticated = true;

    } catch (error) {
      console.error('❌ Wallet validation failed:', error);
      this.isAuthenticated = false;
    }
  }

  async getRealTokenHoldings(): Promise<RealToken[]> {
    try {
      if (!this.isAuthenticated) {
        console.error('❌ Cannot fetch tokens - wallet not authenticated');
        return [];
      }

      const portfolioData = await realPortfolioService.getPortfolioValue();
      const realTokens: RealToken[] = [];

      // Only process tokens with actual value and known mints
      const validMints = new Set([
        'So11111111111111111111111111111111111111112', // SOL
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF
        'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
        '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // SAMO
        '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', // POPCAT
      ]);

      portfolioData.tokens.forEach(token => {
        if (validMints.has(token.mint) && token.usdValue > 0.01) {
          realTokens.push({
            mint: token.mint,
            symbol: token.symbol,
            balance: token.balance,
            decimals: token.decimals,
            usdValue: token.usdValue
          });
        }
      });

      console.log(`📊 Found ${realTokens.length} valid tokens for trading`);
      return realTokens;

    } catch (error) {
      console.error('❌ Error fetching real token holdings:', error);
      return [];
    }
  }

  async executeRealBuy(tokenMint: string, solAmount: number): Promise<RealTrade> {
    const tradeId = Date.now().toString();
    const trade: RealTrade = {
      id: tradeId,
      mint: tokenMint,
      symbol: 'UNKNOWN',
      type: 'BUY',
      amount: 0,
      solAmount,
      txHash: null,
      timestamp: Date.now(),
      status: 'FAILED'
    };

    try {
      if (!this.isAuthenticated) {
        throw new Error('Wallet not authenticated');
      }

      console.log(`🚀 EXECUTING REAL BUY: ${solAmount} SOL → ${tokenMint}`);
      
      const txHash = await realBlockchainTrader.buyToken(tokenMint, solAmount);
      
      if (txHash) {
        trade.txHash = txHash;
        trade.status = 'SUCCESS';
        console.log(`✅ BUY SUCCESSFUL: ${txHash}`);
      } else {
        console.log(`❌ BUY FAILED: No transaction hash returned`);
      }

    } catch (error) {
      console.error(`❌ Buy execution failed:`, error);
    }

    this.realTrades.push(trade);
    return trade;
  }

  async executeRealSell(tokenMint: string, tokenAmount: number): Promise<RealTrade> {
    const tradeId = Date.now().toString();
    const trade: RealTrade = {
      id: tradeId,
      mint: tokenMint,
      symbol: 'UNKNOWN',
      type: 'SELL',
      amount: tokenAmount,
      solAmount: 0,
      txHash: null,
      timestamp: Date.now(),
      status: 'FAILED'
    };

    try {
      if (!this.isAuthenticated) {
        throw new Error('Wallet not authenticated');
      }

      console.log(`💰 EXECUTING REAL SELL: ${tokenAmount} ${tokenMint} → SOL`);
      
      const txHash = await realBlockchainTrader.sellToken(tokenMint, tokenAmount);
      
      if (txHash) {
        trade.txHash = txHash;
        trade.status = 'SUCCESS';
        console.log(`✅ SELL SUCCESSFUL: ${txHash}`);
      } else {
        console.log(`❌ SELL FAILED: No transaction hash returned`);
      }

    } catch (error) {
      console.error(`❌ Sell execution failed:`, error);
    }

    this.realTrades.push(trade);
    return trade;
  }

  async liquidateAllTokens(): Promise<RealTrade[]> {
    console.log('🔥 LIQUIDATING ALL TOKENS TO SOL');
    
    const tokens = await this.getRealTokenHoldings();
    const liquidationTrades: RealTrade[] = [];

    for (const token of tokens) {
      if (token.mint === 'So11111111111111111111111111111111111111112') {
        continue; // Skip SOL
      }

      if (token.usdValue > 1.0) { // Only liquidate tokens worth > $1
        console.log(`🎯 Liquidating ${token.symbol}: $${token.usdValue.toFixed(2)}`);
        
        const trade = await this.executeRealSell(token.mint, token.balance);
        liquidationTrades.push(trade);
        
        // Wait between trades to avoid rate limits
        await this.delay(2000);
      }
    }

    console.log(`✅ Liquidation complete: ${liquidationTrades.length} transactions`);
    return liquidationTrades;
  }

  getRealTrades(): RealTrade[] {
    return this.realTrades.filter(trade => trade.status === 'SUCCESS');
  }

  getWalletAddress(): string {
    return this.targetWallet;
  }

  isWalletAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const authenticTradingEngine = new AuthenticTradingEngine();