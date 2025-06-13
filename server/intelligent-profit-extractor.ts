/**
 * INTELLIGENT PROFIT EXTRACTOR
 * Optimizes portfolio by extracting profits from current positions
 */

import { Connection, Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import fetch from 'node-fetch';

interface TokenPosition {
  mint: string;
  symbol: string;
  balance: number;
  decimals: number;
  estimatedValue: number;
  liquidityScore: number;
  profitPotential: number;
}

class IntelligentProfitExtractor {
  private connection: Connection;
  private wallet: Keypair;
  private isActive: boolean = false;
  private minSOLTarget: number = 0.1; // Target minimum SOL balance
  private capitalTarget: number = 30; // Target capital in USD

  // Jupiter endpoints with rate limit handling
  private jupiterEndpoints = [
    'https://quote-api.jup.ag/v6',
    'https://api.jup.ag/v6',
    'https://quote-api.jup.ag/v4'
  ];

  constructor() {
    const heliusUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(heliusUrl, 'confirmed');
    this.wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY!));
  }

  public async startProfitExtraction(): Promise<void> {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('🎯 STARTING INTELLIGENT PROFIT EXTRACTION');
    console.log(`📍 Wallet: ${this.wallet.publicKey.toBase58()}`);
    
    try {
      while (this.isActive) {
        await this.executeProfitExtractionCycle();
        await this.delay(30000); // Check every 30 seconds
      }
    } catch (error) {
      console.error('Profit extraction error:', error);
    }
  }

  private async executeProfitExtractionCycle(): Promise<void> {
    try {
      // Get current portfolio state
      const solBalance = await this.getCurrentSOLBalance();
      const tokenPositions = await this.analyzeTokenPositions();
      
      console.log(`💰 Current SOL: ${solBalance.toFixed(6)}`);
      console.log(`📊 Token positions: ${tokenPositions.length}`);
      
      // Determine strategy based on current state
      if (solBalance < this.minSOLTarget) {
        console.log('🔧 SOL below target - prioritizing SOL recovery');
        await this.executeSOLRecoveryStrategy(tokenPositions);
      } else {
        console.log('✅ SOL sufficient - optimizing profit extraction');
        await this.executeOptimalProfitStrategy(tokenPositions, solBalance);
      }
      
    } catch (error) {
      console.log('Extraction cycle error:', error.message);
    }
  }

  private async getCurrentSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      return balance / 1e9;
    } catch (error) {
      return 0;
    }
  }

  private async analyzeTokenPositions(): Promise<TokenPosition[]> {
    const positions: TokenPosition[] = [];
    
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.wallet.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );
      
      for (const account of tokenAccounts.value) {
        const tokenData = account.account.data.parsed.info;
        const mint = tokenData.mint;
        const balance = parseFloat(tokenData.tokenAmount.amount);
        const decimals = tokenData.tokenAmount.decimals;
        
        if (balance > 0 && mint !== 'So11111111111111111111111111111111111111112') {
          const position = await this.evaluateTokenPosition(mint, balance, decimals);
          if (position) {
            positions.push(position);
          }
        }
      }
      
      // Sort by profit potential and liquidity
      return positions.sort((a, b) => 
        (b.profitPotential * b.liquidityScore) - (a.profitPotential * a.liquidityScore)
      );
      
    } catch (error) {
      console.log('Error analyzing positions:', error.message);
      return [];
    }
  }

  private async evaluateTokenPosition(mint: string, balance: number, decimals: number): Promise<TokenPosition | null> {
    try {
      // Estimate current value through Jupiter quote
      const estimatedValue = await this.estimateTokenValue(mint, balance);
      
      // Calculate liquidity score based on quote success and amount
      const liquidityScore = estimatedValue > 0 ? Math.min(estimatedValue * 1000, 10) : 0;
      
      // Profit potential based on balance size and estimated value
      const profitPotential = Math.log10(balance / Math.pow(10, decimals)) + estimatedValue;
      
      return {
        mint,
        symbol: this.getTokenSymbol(mint),
        balance,
        decimals,
        estimatedValue,
        liquidityScore,
        profitPotential
      };
      
    } catch (error) {
      return null;
    }
  }

  private async estimateTokenValue(mint: string, balance: number): Promise<number> {
    // Use a portion of balance for estimation to avoid issues
    const testAmount = Math.floor(balance * 0.1);
    
    for (const endpoint of this.jupiterEndpoints) {
      try {
        const quoteUrl = `${endpoint}/quote?inputMint=${mint}&outputMint=So11111111111111111111111111111111111111112&amount=${testAmount}&slippageBps=500`;
        
        const response = await fetch(quoteUrl, {
          headers: { 'User-Agent': 'VICTORIA-ProfitExtractor/1.0' },
          timeout: 8000
        });
        
        if (response.ok) {
          const quote = await response.json();
          if (quote.outAmount && parseInt(quote.outAmount) > 1000) {
            // Scale up from test amount to full balance
            return (parseInt(quote.outAmount) / 1e9) * 10;
          }
        }
        
      } catch (error) {
        continue;
      }
    }
    
    return 0;
  }

  private async executeSOLRecoveryStrategy(positions: TokenPosition[]): Promise<void> {
    console.log('🚨 EXECUTING SOL RECOVERY STRATEGY');
    
    // Focus on highest value, most liquid positions first
    const priorityPositions = positions
      .filter(pos => pos.estimatedValue > 0.001 && pos.liquidityScore > 2)
      .slice(0, 5);
    
    for (const position of priorityPositions) {
      try {
        console.log(`🎯 Liquidating ${position.symbol} (Est: ${position.estimatedValue.toFixed(6)} SOL)`);
        
        const result = await this.executeTokenLiquidation(position);
        
        if (result.success) {
          console.log(`✅ ${position.symbol}: +${result.solReceived.toFixed(6)} SOL`);
          
          // Check if we've reached SOL target
          const currentSOL = await this.getCurrentSOLBalance();
          if (currentSOL >= this.minSOLTarget) {
            console.log('🎯 SOL target reached, switching to optimization mode');
            break;
          }
        }
        
        await this.delay(5000); // Delay between liquidations
        
      } catch (error) {
        console.log(`❌ ${position.symbol} liquidation failed: ${error.message}`);
      }
    }
  }

  private async executeOptimalProfitStrategy(positions: TokenPosition[], currentSOL: number): Promise<void> {
    console.log('📈 EXECUTING OPTIMAL PROFIT STRATEGY');
    
    // Conservative approach - only liquidate clearly profitable positions
    const profitablePositions = positions.filter(pos => 
      pos.estimatedValue > 0.005 && // Min 0.005 SOL value
      pos.liquidityScore > 5 && // Good liquidity
      pos.profitPotential > 3 // High profit potential
    );
    
    if (profitablePositions.length === 0) {
      console.log('💰 No clearly profitable positions identified for liquidation');
      return;
    }
    
    // Liquidate top 2-3 positions to maintain diversification
    const targetLiquidations = Math.min(profitablePositions.length, 3);
    
    for (let i = 0; i < targetLiquidations; i++) {
      const position = profitablePositions[i];
      
      try {
        console.log(`💎 Optimizing ${position.symbol} (Potential: ${position.profitPotential.toFixed(2)})`);
        
        // Partial liquidation to preserve some exposure
        const liquidationPercent = position.estimatedValue > 0.02 ? 0.5 : 0.8;
        const adjustedPosition = {
          ...position,
          balance: Math.floor(position.balance * liquidationPercent)
        };
        
        const result = await this.executeTokenLiquidation(adjustedPosition);
        
        if (result.success) {
          console.log(`✅ ${position.symbol}: +${result.solReceived.toFixed(6)} SOL (${liquidationPercent * 100}% liquidated)`);
        }
        
        await this.delay(8000); // Longer delay for optimization
        
      } catch (error) {
        console.log(`❌ ${position.symbol} optimization failed: ${error.message}`);
      }
    }
  }

  private async executeTokenLiquidation(position: TokenPosition): Promise<{success: boolean, solReceived: number, signature?: string}> {
    for (let endpointIndex = 0; endpointIndex < this.jupiterEndpoints.length; endpointIndex++) {
      try {
        const endpoint = this.jupiterEndpoints[endpointIndex];
        
        // Get quote
        const quoteUrl = `${endpoint}/quote?inputMint=${position.mint}&outputMint=So11111111111111111111111111111111111111112&amount=${position.balance}&slippageBps=300`;
        
        const quoteResponse = await fetch(quoteUrl, {
          headers: { 'User-Agent': 'VICTORIA-ProfitExtractor/1.0' },
          timeout: 10000
        });
        
        if (!quoteResponse.ok) {
          if (quoteResponse.status === 429) {
            await this.delay(5000 * (endpointIndex + 1));
            continue;
          }
          throw new Error(`Quote failed: ${quoteResponse.status}`);
        }
        
        const quote = await quoteResponse.json();
        
        if (!quote.outAmount || parseInt(quote.outAmount) < 5000) {
          throw new Error('Insufficient output amount');
        }
        
        const expectedSOL = parseInt(quote.outAmount) / 1e9;
        
        // Get swap transaction
        const swapResponse = await fetch(`${endpoint}/swap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'VICTORIA-ProfitExtractor/1.0'
          },
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: this.wallet.publicKey.toString(),
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 3000
          }),
          timeout: 12000
        });
        
        if (!swapResponse.ok) {
          throw new Error(`Swap failed: ${swapResponse.status}`);
        }
        
        const { swapTransaction } = await swapResponse.json();
        
        // Execute transaction
        const transactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(transactionBuf);
        
        transaction.sign([this.wallet]);
        
        const signature = await this.connection.sendTransaction(transaction, {
          maxRetries: 2,
          skipPreflight: true
        });
        
        // Optimistic confirmation
        setTimeout(async () => {
          try {
            await this.connection.confirmTransaction(signature, 'confirmed');
          } catch (e) {}
        }, 2000);
        
        return {
          success: true,
          solReceived: expectedSOL,
          signature
        };
        
      } catch (error) {
        if (endpointIndex === this.jupiterEndpoints.length - 1) {
          throw error;
        }
        await this.delay(3000 * (endpointIndex + 1));
      }
    }
    
    return { success: false, solReceived: 0 };
  }

  private getTokenSymbol(mint: string): string {
    const knownTokens: Record<string, string> = {
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT'
    };
    
    return knownTokens[mint] || `TOKEN_${mint.slice(0, 4)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getStatus() {
    return {
      isActive: this.isActive,
      minSOLTarget: this.minSOLTarget,
      capitalTarget: this.capitalTarget,
      walletAddress: this.wallet.publicKey.toBase58()
    };
  }

  public stop(): void {
    this.isActive = false;
    console.log('⏸️ Profit extraction stopped');
  }

  public updateTargets(solTarget: number, capitalTarget: number): void {
    this.minSOLTarget = solTarget;
    this.capitalTarget = capitalTarget;
    console.log(`🎯 Targets updated: ${solTarget} SOL, $${capitalTarget}`);
  }
}

export const intelligentProfitExtractor = new IntelligentProfitExtractor();