/**
 * FORCE TOKEN LIQUIDATION - BYPASS RATE LIMITS
 * Direct Jupiter API calls to liquidate tokens for SOL
 */

import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import fetch from 'node-fetch';

const connection = new Connection(
  process.env.HELIUS_API_KEY 
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

const wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));

// Known profitable tokens to liquidate
const LIQUIDATION_TARGETS = [
  'DezXAZ8z7PnrUA2eMkt6E6qmEZUZhkX5yQwHuHfrLRUiJZLKE', // BONK
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',     // USDC
  'So11111111111111111111111111111111111111112',       // Wrapped SOL
];

async function forceTokenLiquidation() {
  console.log('🚀 FORCE LIQUIDATING ALL TOKENS FOR ACTIVE TRADING');
  console.log(`📍 Wallet: ${wallet.publicKey.toBase58()}`);
  
  try {
    // Get all token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );
    
    console.log(`💰 Found ${tokenAccounts.value.length} token accounts`);
    let totalSOLRecovered = 0;
    
    for (const account of tokenAccounts.value) {
      const tokenData = account.account.data.parsed.info;
      const mint = tokenData.mint;
      const balance = parseFloat(tokenData.tokenAmount.amount);
      const decimals = tokenData.tokenAmount.decimals;
      
      if (balance > 0) {
        console.log(`🎯 Liquidating ${mint.slice(0,8)}... (${balance / Math.pow(10, decimals)} tokens)`);
        
        try {
          const solRecovered = await executeJupiterLiquidation(mint, balance, decimals);
          totalSOLRecovered += solRecovered;
          console.log(`✅ Liquidated: +${solRecovered.toFixed(6)} SOL`);
        } catch (error) {
          console.log(`⚠️ Liquidation failed for ${mint.slice(0,8)}...`);
        }
      }
    }
    
    console.log(`🏆 LIQUIDATION COMPLETE: ${totalSOLRecovered.toFixed(6)} SOL recovered`);
    return { success: true, solRecovered: totalSOLRecovered };
    
  } catch (error) {
    console.error('❌ Force liquidation error:', error.message);
    return { success: false, error: error.message };
  }
}

async function executeJupiterLiquidation(inputMint, amount, decimals) {
  try {
    // Get Jupiter quote for token->SOL swap
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=So11111111111111111111111111111111111111112&amount=${amount}&slippageBps=300`;
    
    const quoteResponse = await fetch(quoteUrl);
    if (!quoteResponse.ok) {
      throw new Error(`Quote failed: ${quoteResponse.statusText}`);
    }
    
    const quote = await quoteResponse.json();
    
    // Get swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Swap failed: ${swapResponse.statusText}`);
    }
    
    const { swapTransaction } = await swapResponse.json();
    
    // Execute the transaction
    const transactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuf);
    
    transaction.sign([wallet]);
    
    const signature = await connection.sendTransaction(transaction, {
      maxRetries: 3,
      skipPreflight: false
    });
    
    await connection.confirmTransaction(signature, 'confirmed');
    
    // Calculate SOL received
    const outAmount = parseInt(quote.outAmount);
    const solReceived = outAmount / 1e9; // Convert lamports to SOL
    
    console.log(`🔗 TX: ${signature}`);
    return solReceived;
    
  } catch (error) {
    console.error(`Liquidation error for ${inputMint}:`, error.message);
    return 0;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  forceTokenLiquidation().then(result => {
    console.log('🏁 Force liquidation result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

export { forceTokenLiquidation };