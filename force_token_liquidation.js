/**
 * FORCE TOKEN LIQUIDATION - BYPASS RATE LIMITS
 * Direct Jupiter API calls to liquidate tokens for SOL
 */

import { Connection, Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import fetch from 'node-fetch';

const wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));
const connection = new Connection(
  process.env.HELIUS_API_KEY 
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

async function forceTokenLiquidation() {
  console.log('💰 FORCE TOKEN LIQUIDATION - RECOVERING SOL CAPITAL');
  console.log(`📍 Wallet: ${wallet.publicKey.toBase58()}`);
  
  try {
    // Get current SOL balance
    const initialBalance = await connection.getBalance(wallet.publicKey);
    const initialSOL = initialBalance / 1e9;
    console.log(`💳 Initial SOL: ${initialSOL.toFixed(6)}`);
    
    // Get all token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );
    
    console.log(`📊 Found ${tokenAccounts.value.length} token accounts`);
    
    let totalSOLRecovered = 0;
    let successfulLiquidations = 0;
    
    // Process tokens with actual balances
    for (const account of tokenAccounts.value) {
      const tokenData = account.account.data.parsed.info;
      const mint = tokenData.mint;
      const balance = parseFloat(tokenData.tokenAmount.amount);
      const decimals = tokenData.tokenAmount.decimals;
      
      if (balance > 0 && mint !== 'So11111111111111111111111111111111111111112') {
        console.log(`\n🎯 Processing: ${mint.slice(0,8)}...`);
        console.log(`   Balance: ${(balance / Math.pow(10, decimals)).toFixed(6)} tokens`);
        
        try {
          const solReceived = await executeJupiterLiquidation(mint, balance, decimals);
          
          if (solReceived > 0) {
            totalSOLRecovered += solReceived;
            successfulLiquidations++;
            console.log(`✅ Liquidated: +${solReceived.toFixed(6)} SOL`);
          } else {
            console.log(`⚠️ No SOL received from liquidation`);
          }
          
          // Delay between liquidations to avoid overwhelming APIs
          await delay(3000);
          
        } catch (error) {
          console.log(`❌ Liquidation failed: ${error.message.slice(0, 80)}`);
          await delay(2000);
        }
      }
    }
    
    // Check final balance
    const finalBalance = await connection.getBalance(wallet.publicKey);
    const finalSOL = finalBalance / 1e9;
    const netGain = finalSOL - initialSOL;
    
    console.log(`\n📊 LIQUIDATION SUMMARY:`);
    console.log(`   Initial SOL: ${initialSOL.toFixed(6)}`);
    console.log(`   Final SOL: ${finalSOL.toFixed(6)}`);
    console.log(`   Net Recovery: ${netGain.toFixed(6)} SOL`);
    console.log(`   Successful: ${successfulLiquidations} liquidations`);
    console.log(`   Total Recovered: ${totalSOLRecovered.toFixed(6)} SOL`);
    
    if (finalSOL > 0.5) {
      console.log(`\n🚀 SUFFICIENT CAPITAL RECOVERED`);
      console.log(`💡 Ready for optimized trading strategy`);
    } else {
      console.log(`\n⚠️ Additional recovery strategies needed`);
    }
    
    return {
      success: true,
      initialSOL,
      finalSOL,
      netGain,
      successfulLiquidations,
      totalRecovered: totalSOLRecovered
    };
    
  } catch (error) {
    console.error('❌ Force liquidation error:', error.message);
    return { success: false, error: error.message };
  }
}

async function executeJupiterLiquidation(inputMint, amount, decimals) {
  // Multiple Jupiter endpoints for redundancy
  const endpoints = [
    'https://quote-api.jup.ag/v6',
    'https://api.jup.ag/v6',
    'https://quote-api.jup.ag/v4'
  ];
  
  // Use 90% of balance for liquidation, keep 10% to maintain account
  const liquidationAmount = Math.floor(amount * 0.9);
  
  for (let i = 0; i < endpoints.length; i++) {
    try {
      const endpoint = endpoints[i];
      
      // Get quote with generous slippage tolerance
      const quoteUrl = `${endpoint}/quote?inputMint=${inputMint}&outputMint=So11111111111111111111111111111111111111112&amount=${liquidationAmount}&slippageBps=500&onlyDirectRoutes=false`;
      
      const quoteResponse = await fetch(quoteUrl, {
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'VICTORIA-ForceRecovery/1.0'
        }
      });
      
      if (!quoteResponse.ok) {
        if (quoteResponse.status === 429) {
          console.log(`Rate limit on ${endpoint}, trying next...`);
          await delay(5000 * (i + 1));
          continue;
        }
        throw new Error(`Quote failed: ${quoteResponse.status}`);
      }
      
      const quote = await quoteResponse.json();
      
      if (!quote.outAmount || parseInt(quote.outAmount) < 1000) {
        throw new Error('Output amount too low');
      }
      
      const expectedSOL = parseInt(quote.outAmount) / 1e9;
      console.log(`   Expected SOL: ${expectedSOL.toFixed(6)}`);
      
      // Skip if expected output is too small
      if (expectedSOL < 0.001) {
        throw new Error('Expected SOL too small');
      }
      
      // Get swap transaction
      const swapResponse = await fetch(`${endpoint}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'VICTORIA-ForceRecovery/1.0'
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 2000
        }),
        timeout: 20000
      });
      
      if (!swapResponse.ok) {
        throw new Error(`Swap failed: ${swapResponse.status}`);
      }
      
      const { swapTransaction } = await swapResponse.json();
      
      if (!swapTransaction) {
        throw new Error('No swap transaction received');
      }
      
      // Execute transaction
      const transactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuf);
      
      transaction.sign([wallet]);
      
      const signature = await connection.sendTransaction(transaction, {
        maxRetries: 3,
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      console.log(`   TX: ${signature}`);
      
      // Try to confirm but don't fail if confirmation times out
      try {
        await connection.confirmTransaction(signature, 'confirmed');
      } catch (confirmError) {
        console.log(`   Confirmation timeout, but transaction may still succeed`);
      }
      
      return expectedSOL;
      
    } catch (error) {
      if (i === endpoints.length - 1) {
        throw error;
      }
      console.log(`   Endpoint ${i + 1} failed, trying next...`);
      await delay(3000 * (i + 1));
    }
  }
  
  throw new Error('All Jupiter endpoints failed');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  forceTokenLiquidation().then(result => {
    console.log('\n🏁 Force liquidation completed:', result);
    
    if (result.success && result.finalSOL > 0.5) {
      console.log('🎯 Capital recovery successful - ready for optimized trading');
    } else if (result.success) {
      console.log('⚠️ Partial recovery - consider additional strategies');
    }
    
    process.exit(result.success ? 0 : 1);
  });
}

export { forceTokenLiquidation };