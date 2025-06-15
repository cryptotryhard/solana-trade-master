/**
 * EXECUTE PRECISE LIQUIDATION
 * Real Jupiter swaps using exact wallet balances
 */

import { Connection, PublicKey, Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import fetch from 'node-fetch';

class PreciseLiquidationExecutor {
  constructor() {
    this.wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));
    this.walletAddress = this.wallet.publicKey.toString();
    
    this.connections = [
      new Connection(process.env.QUICKNODE_RPC_URL, 'confirmed'),
      new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, 'confirmed')
    ];
    
    console.log(`🔥 PRECISE LIQUIDATION EXECUTOR`);
    console.log(`💼 Wallet: ${this.walletAddress}`);
  }

  async executePreciseLiquidation() {
    console.log('\n🚀 EXECUTING PRECISE LIQUIDATION WITH REAL BALANCES');
    
    const tokensToLiquidate = [
      {
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: 'BONK',
        balance: 26411343.39346,
        decimals: 5,
        rawAmount: '2641134339346'
      },
      {
        mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
        symbol: 'POPCAT',
        balance: 19.296380522,
        decimals: 9,
        rawAmount: '19296380522'
      }
    ];

    let totalSOLRecovered = 0;
    const txHashes = [];
    const solMint = 'So11111111111111111111111111111111111111112';

    for (const token of tokensToLiquidate) {
      try {
        console.log(`\n💸 LIQUIDATING ${token.symbol}`);
        console.log(`   Balance: ${token.balance} tokens`);
        console.log(`   Raw amount: ${token.rawAmount}`);
        
        // Get Jupiter quote with exact raw amount
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${token.mint}&outputMint=${solMint}&amount=${token.rawAmount}&slippageBps=300`;
        
        console.log(`📊 Getting Jupiter quote...`);
        const quoteResponse = await fetch(quoteUrl);
        
        if (!quoteResponse.ok) {
          console.log(`❌ Quote failed: ${quoteResponse.status}`);
          continue;
        }
        
        const quote = await quoteResponse.json();
        
        if (!quote || quote.error) {
          console.log(`❌ Invalid quote: ${quote?.error || 'Unknown error'}`);
          continue;
        }
        
        const expectedSOL = Number(quote.outAmount) / 1e9;
        console.log(`📊 Expected SOL: ${expectedSOL.toFixed(4)}`);
        
        // Execute Jupiter swap
        const swapRequest = {
          quoteResponse: quote,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        };
        
        console.log(`🚀 Executing swap transaction...`);
        const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(swapRequest)
        });
        
        if (!swapResponse.ok) {
          console.log(`❌ Swap failed: ${swapResponse.status}`);
          continue;
        }
        
        const swapData = await swapResponse.json();
        
        if (!swapData.swapTransaction) {
          console.log(`❌ No swap transaction returned`);
          continue;
        }
        
        // Sign and send transaction
        const connection = this.connections[0];
        const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        
        transaction.sign([this.wallet]);
        
        const txid = await connection.sendRawTransaction(transaction.serialize());
        console.log(`📡 Transaction sent: ${txid}`);
        
        // Wait for confirmation
        await this.waitForConfirmation(txid);
        
        totalSOLRecovered += expectedSOL;
        txHashes.push(txid);
        
        console.log(`✅ ${token.symbol} LIQUIDATED`);
        console.log(`🔗 TX: ${txid}`);
        console.log(`💰 SOL received: ${expectedSOL.toFixed(4)}`);
        
        await this.delay(3000);
        
      } catch (error) {
        console.error(`❌ Error liquidating ${token.symbol}:`, error.message);
      }
    }

    console.log(`\n🏁 PRECISE LIQUIDATION COMPLETE`);
    console.log(`💰 Total SOL recovered: ${totalSOLRecovered.toFixed(4)}`);
    console.log(`📊 Successful swaps: ${txHashes.length}/${tokensToLiquidate.length}`);
    
    // Check final SOL balance
    const finalSOLBalance = await this.getFinalSOLBalance();
    console.log(`💰 Final SOL balance: ${finalSOLBalance.toFixed(4)} SOL`);
    
    if (txHashes.length > 0) {
      console.log(`\n🔗 Transaction Hashes:`);
      txHashes.forEach((tx, i) => {
        console.log(`   ${i + 1}. ${tx}`);
      });
      
      console.log(`\n🚀 READY FOR FRESH ULTRA-AGGRESSIVE TRADING`);
      console.log(`💰 Available capital: ${finalSOLBalance.toFixed(4)} SOL (~$${(finalSOLBalance * 152).toFixed(2)})`);
    }

    return {
      success: txHashes.length > 0,
      totalSOLRecovered,
      finalSOLBalance,
      txHashes
    };
  }

  async waitForConfirmation(txHash) {
    console.log(`⏳ Confirming transaction...`);
    
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

  async getFinalSOLBalance() {
    try {
      const connection = this.connections[0];
      const balance = await connection.getBalance(this.wallet.publicKey);
      return balance / 1e9;
    } catch (error) {
      console.error('Failed to get SOL balance:', error);
      return 0;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  try {
    const executor = new PreciseLiquidationExecutor();
    await executor.executePreciseLiquidation();
  } catch (error) {
    console.error('❌ Precise liquidation failed:', error.message);
  }
}

main();