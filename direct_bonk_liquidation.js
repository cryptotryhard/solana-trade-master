/**
 * DIRECT BONK/USDC LIQUIDATION SCRIPT
 * Bypasses API rate limits by using direct Jupiter swaps
 */

import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import fetch from 'node-fetch';

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const RPC_URL = 'https://api.mainnet-beta.solana.com';

// Token addresses
const BONK_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function directBonkLiquidation() {
  try {
    console.log('🔥 EXECUTING DIRECT BONK/USDC LIQUIDATION');
    
    if (!WALLET_PRIVATE_KEY) {
      throw new Error('WALLET_PRIVATE_KEY not found');
    }

    // Initialize connection and wallet
    const connection = new Connection(RPC_URL);
    const wallet = Keypair.fromSecretKey(bs58.decode(WALLET_PRIVATE_KEY));
    const walletPubkey = wallet.publicKey;
    
    console.log(`📍 Wallet: ${walletPubkey.toString()}`);
    
    // Check SOL balance
    const solBalance = await connection.getBalance(walletPubkey);
    console.log(`💰 Current SOL balance: ${(solBalance / 1e9).toFixed(6)} SOL`);
    
    // Get BONK token account
    const bonkTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(BONK_MINT),
      walletPubkey
    );
    
    // Get USDC token account
    const usdcTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(USDC_MINT),
      walletPubkey
    );
    
    console.log(`🎯 BONK Token Account: ${bonkTokenAccount.toString()}`);
    console.log(`🎯 USDC Token Account: ${usdcTokenAccount.toString()}`);
    
    // Check BONK balance
    try {
      const bonkAccountInfo = await connection.getTokenAccountBalance(bonkTokenAccount);
      if (bonkAccountInfo.value.uiAmount && bonkAccountInfo.value.uiAmount > 0) {
        console.log(`💰 BONK Balance: ${bonkAccountInfo.value.uiAmount}`);
        console.log(`🔄 Converting BONK to SOL...`);
        
        // Execute BONK → SOL swap
        const bonkSwapResult = await executeJupiterSwap(
          BONK_MINT,
          SOL_MINT,
          bonkAccountInfo.value.amount,
          wallet
        );
        
        if (bonkSwapResult.success) {
          console.log(`✅ BONK → SOL successful: ${bonkSwapResult.txHash}`);
        }
      } else {
        console.log('⚠️ No BONK balance found');
      }
    } catch (error) {
      console.log('⚠️ BONK account not found or empty');
    }
    
    // Check USDC balance
    try {
      const usdcAccountInfo = await connection.getTokenAccountBalance(usdcTokenAccount);
      if (usdcAccountInfo.value.uiAmount && usdcAccountInfo.value.uiAmount > 0) {
        console.log(`💰 USDC Balance: ${usdcAccountInfo.value.uiAmount}`);
        console.log(`🔄 Converting USDC to SOL...`);
        
        // Execute USDC → SOL swap
        const usdcSwapResult = await executeJupiterSwap(
          USDC_MINT,
          SOL_MINT,
          usdcAccountInfo.value.amount,
          wallet
        );
        
        if (usdcSwapResult.success) {
          console.log(`✅ USDC → SOL successful: ${usdcSwapResult.txHash}`);
        }
      } else {
        console.log('⚠️ No USDC balance found');
      }
    } catch (error) {
      console.log('⚠️ USDC account not found or empty');
    }
    
    // Check final SOL balance
    const finalSolBalance = await connection.getBalance(walletPubkey);
    console.log(`🏁 Final SOL balance: ${(finalSolBalance / 1e9).toFixed(6)} SOL`);
    
    const solRecovered = (finalSolBalance - solBalance) / 1e9;
    console.log(`🎯 SOL recovered: ${solRecovered.toFixed(6)} SOL`);
    
    return {
      success: true,
      solRecovered,
      finalBalance: finalSolBalance / 1e9
    };
    
  } catch (error) {
    console.error('❌ Direct liquidation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function executeJupiterSwap(inputMint, outputMint, amount, wallet) {
  try {
    // Get Jupiter quote
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=1000`;
    
    const quoteResponse = await fetch(quoteUrl);
    if (!quoteResponse.ok) {
      throw new Error(`Quote failed: ${quoteResponse.status}`);
    }
    
    const quote = await quoteResponse.json();
    console.log(`📊 Quote: ${amount} → ${quote.outAmount}`);
    
    // Get Jupiter swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Swap failed: ${swapResponse.status}`);
    }
    
    const swapData = await swapResponse.json();
    
    // Execute the transaction
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    
    // Handle both versioned and legacy transactions
    let transaction;
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    
    try {
      // Try versioned transaction first
      transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      transaction.sign([wallet]);
      const txHash = await connection.sendRawTransaction(transaction.serialize());
      
      // Confirm transaction
      await connection.confirmTransaction(txHash, 'confirmed');
      
      return {
        success: true,
        txHash,
        outputAmount: quote.outAmount
      };
    } catch (versionedError) {
      console.log('Versioned transaction failed, trying legacy...');
      
      // Fallback to legacy transaction
      try {
        transaction = Transaction.from(swapTransactionBuf);
        transaction.sign(wallet);
        const txHash = await connection.sendRawTransaction(transaction.serialize());
        
        // Confirm transaction
        await connection.confirmTransaction(txHash, 'confirmed');
        
        return {
          success: true,
          txHash,
          outputAmount: quote.outAmount
        };
      } catch (legacyError) {
        throw new Error(`Both versioned and legacy transaction failed: ${versionedError.message}, ${legacyError.message}`);
      }
    }
    
    // Confirm transaction
    await connection.confirmTransaction(txHash, 'confirmed');
    
    return {
      success: true,
      txHash,
      outputAmount: quote.outAmount
    };
    
  } catch (error) {
    console.error('❌ Jupiter swap failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  directBonkLiquidation()
    .then(result => {
      console.log('🏁 Direct liquidation result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { directBonkLiquidation };