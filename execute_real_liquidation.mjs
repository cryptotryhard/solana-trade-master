/**
 * EXECUTE REAL LIQUIDATION
 * Direct Jupiter swaps using Phantom wallet private key
 */

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import fetch from 'node-fetch';

class RealLiquidationExecutor {
  constructor() {
    if (!process.env.WALLET_PRIVATE_KEY) {
      throw new Error('WALLET_PRIVATE_KEY environment variable required');
    }
    
    this.wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));
    this.walletAddress = this.wallet.publicKey.toString();
    
    this.connections = [
      new Connection(process.env.QUICKNODE_RPC_URL, 'confirmed'),
      new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, 'confirmed'),
      new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
    ];
    
    console.log(`🔥 REAL LIQUIDATION EXECUTOR INITIALIZED`);
    console.log(`💼 Wallet: ${this.walletAddress}`);
  }

  async executeRealLiquidation() {
    console.log('\n🚀 EXECUTING REAL LIQUIDATION - NO SIMULATION');
    
    const tokensToLiquidate = [
      {
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: 'BONK',
        balance: 30000000,
        decimals: 5
      },
      {
        mint: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
        symbol: 'SAMO', 
        balance: 25000,
        decimals: 9
      },
      {
        mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
        symbol: 'POPCAT',
        balance: 19.32,
        decimals: 6
      }
    ];

    let totalSOLRecovered = 0;
    const txHashes = [];

    for (const token of tokensToLiquidate) {
      try {
        console.log(`\n💸 LIQUIDATING ${token.symbol}`);
        console.log(`   Mint: ${token.mint}`);
        console.log(`   Balance: ${token.balance}`);
        
        const result = await this.executeJupiterSwap(token);
        
        if (result.success) {
          totalSOLRecovered += result.solReceived;
          txHashes.push(result.txHash);
          
          console.log(`✅ ${token.symbol} LIQUIDATED`);
          console.log(`🔗 TX: ${result.txHash}`);
          console.log(`💰 SOL received: ${result.solReceived.toFixed(4)}`);
          
          await this.waitForConfirmation(result.txHash);
        } else {
          console.log(`❌ Failed to liquidate ${token.symbol}: ${result.error}`);
        }
        
        await this.delay(3000);
        
      } catch (error) {
        console.error(`❌ Error liquidating ${token.symbol}:`, error.message);
      }
    }

    console.log(`\n🏁 LIQUIDATION COMPLETE`);
    console.log(`💰 Total SOL recovered: ${totalSOLRecovered.toFixed(4)}`);
    console.log(`📊 Successful swaps: ${txHashes.length}/${tokensToLiquidate.length}`);
    
    if (txHashes.length > 0) {
      console.log(`\n🔗 Transaction Hashes:`);
      txHashes.forEach((tx, i) => {
        console.log(`   ${i + 1}. ${tx}`);
      });
    }

    return {
      success: txHashes.length > 0,
      totalSOLRecovered,
      txHashes
    };
  }

  async executeJupiterSwap(token) {
    try {
      console.log(`🔄 Getting Jupiter quote for ${token.symbol}`);
      
      const quote = await this.getJupiterQuote(token);
      if (!quote) {
        return { success: false, error: 'Failed to get quote' };
      }
      
      console.log(`📊 Quote: ${(Number(quote.outAmount) / 1e9).toFixed(4)} SOL`);
      
      const swap = await this.executeSwapTransaction(quote, token);
      if (!swap) {
        return { success: false, error: 'Failed to execute swap' };
      }
      
      return {
        success: true,
        txHash: swap.txid,
        solReceived: Number(quote.outAmount) / 1e9
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getJupiterQuote(token) {
    const amount = Math.floor(token.balance * Math.pow(10, token.decimals));
    const solMint = 'So11111111111111111111111111111111111111112';
    
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${token.mint}&outputMint=${solMint}&amount=${amount}&slippageBps=300`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Jupiter quote failed: ${response.status}`);
    }
    
    const quote = await response.json();
    
    if (!quote || quote.error) {
      throw new Error(`Invalid quote: ${quote?.error || 'Unknown error'}`);
    }
    
    return quote;
  }

  async executeSwapTransaction(quote, token) {
    console.log(`🚀 Executing swap transaction for ${token.symbol}`);
    
    const swapRequest = {
      quoteResponse: quote,
      userPublicKey: this.wallet.publicKey.toString(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    };
    
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(swapRequest)
    });
    
    if (!response.ok) {
      throw new Error(`Jupiter swap failed: ${response.status}`);
    }
    
    const swapData = await response.json();
    
    if (!swapData.swapTransaction) {
      throw new Error('No swap transaction returned');
    }
    
    const connection = this.connections[0];
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    
    // Handle versioned transactions from Jupiter
    const { VersionedTransaction } = await import('@solana/web3.js');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    
    transaction.sign([this.wallet]);
    
    const txid = await connection.sendRawTransaction(transaction.serialize());
    console.log(`📡 Transaction sent: ${txid}`);
    
    return { txid };
  }

  async waitForConfirmation(txHash) {
    console.log(`⏳ Waiting for confirmation: ${txHash}`);
    
    const connection = this.connections[0];
    
    try {
      const confirmation = await connection.confirmTransaction(txHash, 'confirmed');
      
      if (confirmation.value.err) {
        console.log(`❌ Transaction failed: ${confirmation.value.err}`);
      } else {
        console.log(`✅ Transaction confirmed`);
      }
    } catch (error) {
      console.log(`⚠️ Confirmation timeout`);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  try {
    const executor = new RealLiquidationExecutor();
    await executor.executeRealLiquidation();
  } catch (error) {
    console.error('❌ Execution failed:', error.message);
  }
}

main();