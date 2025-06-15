/**
 * REAL LIQUIDATION ENGINE
 * Execute authentic Jupiter swaps with Phantom wallet private key
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

interface TokenToLiquidate {
  mint: string;
  symbol: string;
  balance: number;
  decimals: number;
  expectedUSD: number;
}

export class RealLiquidationEngine {
  private wallet: Keypair;
  private walletAddress = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
  
  private connections: Connection[] = [
    new Connection(process.env.QUICKNODE_RPC_URL!, 'confirmed'),
    new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, 'confirmed'),
    new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
  ];

  constructor() {
    // Initialize wallet from private key
    if (!process.env.WALLET_PRIVATE_KEY) {
      throw new Error('WALLET_PRIVATE_KEY environment variable required');
    }
    
    try {
      const privateKeyBytes = bs58.decode(process.env.WALLET_PRIVATE_KEY);
      this.wallet = Keypair.fromSecretKey(privateKeyBytes);
      
      if (this.wallet.publicKey.toString() !== this.walletAddress) {
        throw new Error('Private key does not match expected wallet address');
      }
      
      console.log(`✅ Wallet initialized: ${this.walletAddress}`);
    } catch (error) {
      throw new Error(`Failed to initialize wallet: ${error}`);
    }
  }

  async executeCompleteLiquidation(): Promise<{
    success: boolean;
    totalSOLRecovered: number;
    liquidatedTokens: string[];
    txHashes: string[];
  }> {
    console.log('🔥 EXECUTING REAL LIQUIDATION - NO SIMULATION');
    console.log(`💼 Wallet: ${this.walletAddress}`);
    
    // Define tokens to liquidate based on current wallet holdings
    const tokensToLiquidate: TokenToLiquidate[] = [
      {
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: 'BONK',
        balance: 30000000,
        decimals: 5,
        expectedUSD: 395.15
      },
      {
        mint: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
        symbol: 'SAMO',
        balance: 25000,
        decimals: 9,
        expectedUSD: 57.00
      },
      {
        mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
        symbol: 'POPCAT',
        balance: 19.32,
        decimals: 6,
        expectedUSD: 6.18
      }
    ];

    const liquidatedTokens: string[] = [];
    const txHashes: string[] = [];
    let totalSOLRecovered = 0;

    for (const token of tokensToLiquidate) {
      try {
        console.log(`\n💸 LIQUIDATING ${token.symbol} ($${token.expectedUSD})`);
        console.log(`   Balance: ${token.balance} tokens`);
        console.log(`   Mint: ${token.mint}`);
        
        const result = await this.executeRealJupiterSwap(token);
        
        if (result.success && result.txHash) {
          liquidatedTokens.push(token.symbol);
          txHashes.push(result.txHash);
          totalSOLRecovered += result.solReceived || 0;
          
          console.log(`✅ ${token.symbol} LIQUIDATED`);
          console.log(`🔗 TX: ${result.txHash}`);
          console.log(`💰 SOL received: ${result.solReceived?.toFixed(4) || 0}`);
          
          // Wait for confirmation
          await this.waitForConfirmation(result.txHash);
          
        } else {
          console.log(`❌ Failed to liquidate ${token.symbol}`);
        }
        
        // Delay between swaps to avoid rate limits
        await this.delay(3000);
        
      } catch (error) {
        console.error(`❌ Error liquidating ${token.symbol}:`, error);
      }
    }

    console.log(`\n🏁 LIQUIDATION SUMMARY:`);
    console.log(`   Tokens liquidated: ${liquidatedTokens.join(', ')}`);
    console.log(`   Total SOL recovered: ${totalSOLRecovered.toFixed(4)}`);
    console.log(`   Transaction hashes: ${txHashes.length}`);

    return {
      success: liquidatedTokens.length > 0,
      totalSOLRecovered,
      liquidatedTokens,
      txHashes
    };
  }

  private async executeRealJupiterSwap(token: TokenToLiquidate): Promise<{
    success: boolean;
    txHash?: string;
    solReceived?: number;
  }> {
    try {
      console.log(`🔄 Executing real Jupiter swap: ${token.symbol} → SOL`);
      
      // Get Jupiter quote
      const quoteResponse = await this.getJupiterQuote(token);
      
      if (!quoteResponse) {
        throw new Error('Failed to get Jupiter quote');
      }
      
      // Execute Jupiter swap
      const swapResponse = await this.executeJupiterTransaction(quoteResponse, token);
      
      if (!swapResponse) {
        throw new Error('Failed to execute Jupiter swap');
      }
      
      return {
        success: true,
        txHash: swapResponse.txid,
        solReceived: swapResponse.outputAmount ? Number(swapResponse.outputAmount) / 1e9 : 0
      };
      
    } catch (error) {
      console.error(`Jupiter swap failed for ${token.symbol}:`, error);
      return { success: false };
    }
  }

  private async getJupiterQuote(token: TokenToLiquidate) {
    const amount = Math.floor(token.balance * Math.pow(10, token.decimals));
    const solMint = 'So11111111111111111111111111111111111111112';
    
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${token.mint}&outputMint=${solMint}&amount=${amount}&slippageBps=300`;
    
    console.log(`📊 Getting Jupiter quote for ${token.symbol}`);
    
    const response = await fetch(quoteUrl);
    
    if (!response.ok) {
      throw new Error(`Jupiter quote failed: ${response.status}`);
    }
    
    const quote = await response.json();
    
    if (!quote || quote.error) {
      throw new Error(`Invalid quote response: ${quote?.error || 'Unknown error'}`);
    }
    
    console.log(`✅ Quote received: ${Number(quote.outAmount) / 1e9} SOL`);
    return quote;
  }

  private async executeJupiterTransaction(quote: any, token: TokenToLiquidate) {
    console.log(`🚀 Executing Jupiter transaction for ${token.symbol}`);
    
    const swapRequest = {
      quoteResponse: quote,
      userPublicKey: this.wallet.publicKey.toString(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    };
    
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(swapRequest)
    });
    
    if (!response.ok) {
      throw new Error(`Jupiter swap API failed: ${response.status}`);
    }
    
    const swapData = await response.json();
    
    if (!swapData.swapTransaction) {
      throw new Error('No swap transaction returned from Jupiter');
    }
    
    // Deserialize and sign the transaction
    const connection = this.connections[0];
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    
    const { Transaction } = await import('@solana/web3.js');
    const transaction = Transaction.from(swapTransactionBuf);
    transaction.sign(this.wallet);
    
    // Send the signed transaction
    const txid = await connection.sendRawTransaction(transaction.serialize());
    
    console.log(`📡 Transaction sent: ${txid}`);
    
    return {
      txid,
      outputAmount: quote.outAmount
    };
  }

  private async waitForConfirmation(txHash: string): Promise<void> {
    console.log(`⏳ Waiting for confirmation: ${txHash}`);
    
    const connection = this.connections[0];
    
    try {
      const confirmation = await connection.confirmTransaction(txHash, 'confirmed');
      
      if (confirmation.value.err) {
        console.log(`❌ Transaction failed: ${confirmation.value.err}`);
      } else {
        console.log(`✅ Transaction confirmed: ${txHash}`);
      }
    } catch (error) {
      console.log(`⚠️ Confirmation timeout for: ${txHash}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getCurrentSOLBalance(): Promise<number> {
    try {
      const connection = this.connections[0];
      const balance = await connection.getBalance(this.wallet.publicKey);
      return balance / 1e9;
    } catch (error) {
      console.error('Failed to get SOL balance:', error);
      return 0;
    }
  }

  getWalletAddress(): string {
    return this.walletAddress;
  }
}

export const realLiquidationEngine = new RealLiquidationEngine();