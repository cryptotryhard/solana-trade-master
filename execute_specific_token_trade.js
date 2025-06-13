/**
 * EXECUTE SPECIFIC TOKEN TRADE
 * Trade the exact token: 3ZFPNiazj2AdZV1jKBkTbJH3M645T61pcbJeMSGzpump
 */

import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const TARGET_TOKEN = "3ZFPNiazj2AdZV1jKBkTbJH3M645T61pcbJeMSGzpump";

class SpecificTokenTrader {
  constructor() {
    this.wallet = Keypair.fromSecretKey(bs58.decode(WALLET_PRIVATE_KEY));
    this.rpcEndpoints = [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
      'https://rpc.ankr.com/solana',
      'https://solana-mainnet.g.alchemy.com/v2/demo',
      'https://api.metaplex.solana.com/'
    ];
    this.currentRpcIndex = 0;
    this.connection = new Connection(this.rpcEndpoints[0], 'confirmed');
    console.log(`🎯 TARGET TOKEN: ${TARGET_TOKEN}`);
    console.log(`💼 Trading Wallet: ${this.wallet.publicKey.toString()}`);
  }

  switchRPC() {
    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcEndpoints.length;
    this.connection = new Connection(this.rpcEndpoints[this.currentRpcIndex], 'confirmed');
    console.log(`🔄 Switched to RPC: ${this.rpcEndpoints[this.currentRpcIndex]}`);
  }

  async executeTargetTrade() {
    try {
      console.log(`🚀 EXECUTING TRADE FOR: ${TARGET_TOKEN}`);
      
      // Get current SOL balance
      const solBalance = await this.getSOLBalance();
      console.log(`💰 Current SOL balance: ${solBalance}`);
      
      if (solBalance < 0.01) {
        console.log(`⚠️ Insufficient SOL. Attempting to liquidate BONK first...`);
        await this.liquidateBonkForSOL();
        const newBalance = await this.getSOLBalance();
        console.log(`💰 New SOL balance after BONK liquidation: ${newBalance}`);
      }
      
      // Execute the specific trade
      const tradeAmount = Math.min(0.005, solBalance * 0.1); // Use 10% of balance or 0.005 SOL max
      console.log(`💵 Trading amount: ${tradeAmount} SOL`);
      
      const result = await this.executeJupiterSwap(TARGET_TOKEN, tradeAmount);
      
      if (result.success) {
        console.log(`✅ TRADE SUCCESSFUL!`);
        console.log(`🔗 Transaction: ${result.signature}`);
        console.log(`📊 Amount: ${tradeAmount} SOL → ${TARGET_TOKEN}`);
        
        // Wait and then attempt to sell for profit
        await this.delay(30000); // Wait 30 seconds
        await this.executeProfitTaking(TARGET_TOKEN);
        
        return result;
      } else {
        console.log(`❌ Trade failed: ${result.error}`);
        return result;
      }
      
    } catch (error) {
      console.error(`💥 Error executing target trade:`, error);
      return { success: false, error: error.message };
    }
  }

  async getSOLBalance() {
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error(`Error getting SOL balance:`, error);
      return 0;
    }
  }

  async liquidateBonkForSOL() {
    try {
      console.log(`🔄 Liquidating BONK to SOL...`);
      
      const bonkMint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
      const result = await this.executeJupiterSwap(bonkMint, null, "So11111111111111111111111111111111111111112", true);
      
      if (result.success) {
        console.log(`✅ BONK liquidation successful`);
        console.log(`🔗 TX: ${result.signature}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Error liquidating BONK:`, error);
      return { success: false, error: error.message };
    }
  }

  async executeJupiterSwap(tokenMint, solAmount = null, outputMint = null, liquidateAll = false) {
    try {
      const inputMint = liquidateAll ? tokenMint : "So11111111111111111111111111111111111111112";
      const outputMintAddress = outputMint || tokenMint;
      
      let amount;
      if (liquidateAll) {
        // Get token balance for liquidation
        const tokenAccounts = await this.connection.getTokenAccountsByOwner(
          this.wallet.publicKey,
          { mint: new PublicKey(tokenMint) }
        );
        
        if (tokenAccounts.value.length === 0) {
          return { success: false, error: "No token balance found" };
        }
        
        const accountInfo = await this.connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
        amount = accountInfo.value.amount;
        console.log(`📊 Liquidating ${amount} tokens`);
      } else {
        amount = Math.floor(solAmount * 1e9); // Convert SOL to lamports
      }

      // Get Jupiter quote
      const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMintAddress}&amount=${amount}&slippageBps=300`;
      
      console.log(`🔍 Getting quote from Jupiter...`);
      const quoteResponse = await fetch(quoteUrl);
      const quoteData = await quoteResponse.json();
      
      if (!quoteResponse.ok || quoteData.error) {
        console.log(`❌ Quote error:`, quoteData);
        return { success: false, error: quoteData.error || "Quote failed" };
      }
      
      console.log(`💹 Quote received - estimated output: ${quoteData.outAmount}`);
      
      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true
        })
      });
      
      const swapData = await swapResponse.json();
      
      if (!swapResponse.ok || swapData.error) {
        console.log(`❌ Swap transaction error:`, swapData);
        return { success: false, error: swapData.error || "Swap transaction failed" };
      }
      
      // Deserialize and sign transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      transaction.sign([this.wallet]);
      
      console.log(`📤 Sending transaction to blockchain...`);
      
      // Send transaction
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: true,
        maxRetries: 3
      });
      
      console.log(`🔗 Transaction sent: ${signature}`);
      
      // Confirm transaction
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        console.log(`❌ Transaction failed:`, confirmation.value.err);
        return { success: false, error: "Transaction failed", signature };
      }
      
      console.log(`✅ Transaction confirmed!`);
      return { 
        success: true, 
        signature,
        inputAmount: amount,
        outputAmount: quoteData.outAmount,
        inputMint,
        outputMint: outputMintAddress
      };
      
    } catch (error) {
      console.error(`Jupiter swap error:`, error);
      return { success: false, error: error.message };
    }
  }

  async executeProfitTaking(tokenMint) {
    try {
      console.log(`💰 Attempting profit taking for ${tokenMint}...`);
      
      // Wait a bit for price movement
      await this.delay(10000);
      
      // Get current token balance
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        this.wallet.publicKey,
        { mint: new PublicKey(tokenMint) }
      );
      
      if (tokenAccounts.value.length === 0) {
        console.log(`⚠️ No token balance found for profit taking`);
        return;
      }
      
      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
      const balance = accountInfo.value.amount;
      
      console.log(`📊 Current token balance: ${balance}`);
      
      // Sell 50% for profit taking
      const sellAmount = Math.floor(parseInt(balance) * 0.5);
      
      if (sellAmount > 0) {
        console.log(`💸 Selling ${sellAmount} tokens for profit...`);
        
        const result = await this.executeJupiterSwap(
          tokenMint, 
          null, 
          "So11111111111111111111111111111111111111112", 
          false,
          sellAmount
        );
        
        if (result.success) {
          console.log(`✅ Profit taking successful!`);
          console.log(`🔗 Sell TX: ${result.signature}`);
        }
      }
      
    } catch (error) {
      console.error(`Error in profit taking:`, error);
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  console.log(`🎯 SPECIFIC TOKEN TRADING INITIATED`);
  console.log(`📅 ${new Date().toISOString()}`);
  
  const trader = new SpecificTokenTrader();
  
  const result = await trader.executeTargetTrade();
  
  console.log(`\n📊 FINAL RESULT:`);
  console.log(`Success: ${result.success}`);
  if (result.success) {
    console.log(`Transaction: ${result.signature}`);
    console.log(`🔗 Solscan: https://solscan.io/tx/${result.signature}`);
  } else {
    console.log(`Error: ${result.error}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}