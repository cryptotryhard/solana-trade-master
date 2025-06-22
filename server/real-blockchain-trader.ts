import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import bs58 from 'bs58';

interface JupiterQuoteResponse {
  data: Array<{
    inAmount: string;
    outAmount: string;
    priceImpactPct: number;
    routePlan: any[];
  }>;
}

interface JupiterSwapResponse {
  swapTransaction: string;
}

export class RealBlockchainTrader {
  private connection: Connection;
  private wallet: Keypair;
  private walletAddress: string;

  constructor() {
    // Use QuickNode RPC for reliable connection
    const rpc = process.env.QUICKNODE_RPC || process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
this.connection = new Connection(rpc, 'confirmed');

    
    // Initialize with actual private key for the Phantom wallet
    if (!process.env.WALLET_PRIVATE_KEY) {
      throw new Error('WALLET_PRIVATE_KEY environment variable is required');
    }
    
    this.wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));
    this.walletAddress = this.wallet.publicKey.toString();
    
    console.log(`🔐 Real Blockchain Trader initialized with wallet: ${this.walletAddress}`);
    console.log(`🎯 Target wallet: 9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d`);
    
    // Verify we're using the correct wallet
    if (this.walletAddress !== '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d') {
      console.warn(`⚠️ WARNING: Wallet mismatch! Expected: 9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d, Got: ${this.walletAddress}`);
    }
  }

  async getSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('❌ Error fetching SOL balance:', error);
      return 0;
    }
  }

  async executeJupiterSwap(
    inputMint: string,
    outputMint: string, 
    amount: number,
    slippageBps: number = 50
  ): Promise<string | null> {
    try {
      console.log(`🔄 Executing real Jupiter swap: ${amount} ${inputMint} → ${outputMint}`);
      
      // Get quote from Jupiter
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
      );
      
      if (!quoteResponse.ok) {
        throw new Error(`Jupiter quote failed: ${quoteResponse.statusText}`);
      }
      
      const quoteData = await quoteResponse.json() as JupiterQuoteResponse;
      
      if (!quoteData.data || quoteData.data.length === 0) {
        throw new Error('No routes found for swap');
      }

      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
        })
      });

      if (!swapResponse.ok) {
        throw new Error(`Jupiter swap failed: ${swapResponse.statusText}`);
      }

      const swapData = await swapResponse.json() as JupiterSwapResponse;
      
      // Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      // Sign transaction with the real wallet
      transaction.sign([this.wallet]);
      
      // Send transaction to blockchain
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      console.log(`✅ Real transaction sent: ${signature}`);
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      
      console.log(`✅ Transaction confirmed: ${signature}`);
      return signature;
      
    } catch (error) {
      console.error('❌ Jupiter swap failed:', error);
      
      // Activate fallback DEX routing when Jupiter fails
      try {
        const { fallbackDEXRouter } = await import('./fallback-dex-router');
        console.log(`🔄 REAL BLOCKCHAIN FALLBACK: Using Raydium/Orca for ${outputMint.slice(0, 8)}...`);
        
        // Convert lamports to SOL for fallback router
        const solAmount = amount / 1e9;
        
        if (inputMint === 'So11111111111111111111111111111111111111112') {
          // SOL to token swap
          const result = await fallbackDEXRouter.executeSwap(inputMint, outputMint, solAmount);
          
          if (result.success) {
            console.log(`✅ REAL BLOCKCHAIN FALLBACK SUCCESS: ${solAmount.toFixed(4)} SOL → ${result.tokensReceived?.toFixed(0)} tokens`);
            return result.txHash || null;
          }
        } else {
          // Token to SOL swap
          const result = await fallbackDEXRouter.sellTokens(inputMint, amount);
          
          if (result.success) {
            console.log(`✅ REAL BLOCKCHAIN FALLBACK SUCCESS: ${amount.toFixed(0)} tokens → ${result.tokensReceived?.toFixed(4)} SOL`);
            return result.txHash || null;
          }
        }
      } catch (fallbackError) {
        console.log(`❌ Real blockchain fallback failed: ${fallbackError}`);
      }
      
      return null;
    }
  }

  async buyToken(tokenMint: string, solAmount: number): Promise<string | null> {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    const lamports = Math.floor(solAmount * 1e9);
    
    console.log(`🚀 REAL BUY: ${solAmount} SOL → ${tokenMint}`);
    
    return await this.executeJupiterSwap(SOL_MINT, tokenMint, lamports);
  }

  async sellToken(tokenMint: string, tokenAmount: number): Promise<string | null> {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    
    console.log(`💰 REAL SELL: ${tokenAmount} ${tokenMint} → SOL`);
    
    return await this.executeJupiterSwap(tokenMint, SOL_MINT, tokenAmount);
  }

  getWalletAddress(): string {
    return this.walletAddress;
  }

  async verifyWalletConnection(): Promise<boolean> {
    try {
      const balance = await this.getSOLBalance();
      console.log(`✅ Wallet verified: ${this.walletAddress} | Balance: ${balance} SOL`);
      return true;
    } catch (error) {
      console.error('❌ Wallet verification failed:', error);
      return false;
    }
  }
}

export const realBlockchainTrader = new RealBlockchainTrader();