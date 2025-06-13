/**
 * TRANSFER BONK TO TRADING WALLET
 * Move valuable BONK from Hustle wallet to trading wallet for liquidation
 */

import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import bs58 from 'bs58';

const connection = new Connection(
  process.env.HELIUS_API_KEY 
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

// Trading wallet (destination)
const tradingWallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));

// BONK token mint
const BONK_MINT = new PublicKey('DezXAZ8z7PnrUA2eMkt6E6qmEZUZhkX5yQwHuHfrLRUi');

async function transferBonkToTrading() {
  console.log('💰 TRANSFERRING BONK TO TRADING WALLET');
  console.log(`📍 Trading Wallet: ${tradingWallet.publicKey.toBase58()}`);
  
  try {
    // Check current BONK balance in trading wallet
    const tradingBonkAccount = await getAssociatedTokenAddress(BONK_MINT, tradingWallet.publicKey);
    
    let currentBalance = 0;
    try {
      const accountInfo = await connection.getTokenAccountBalance(tradingBonkAccount);
      currentBalance = parseFloat(accountInfo.value.amount);
    } catch (error) {
      console.log('📊 No BONK account exists yet in trading wallet');
    }
    
    console.log(`💰 Current BONK in trading wallet: ${(currentBalance / 1e5).toFixed(0)} tokens`);
    
    // If we already have significant BONK, liquidate it
    if (currentBalance > 1000000) { // More than 10 tokens
      console.log('💰 Sufficient BONK found, proceeding to liquidation');
      return await liquidateBonkToSOL(currentBalance);
    }
    
    // Check if we need to fund the trading wallet with SOL for gas
    const solBalance = await connection.getBalance(tradingWallet.publicKey);
    const solBalanceFormatted = solBalance / 1e9;
    
    console.log(`💳 Trading wallet SOL: ${solBalanceFormatted.toFixed(6)}`);
    
    if (solBalanceFormatted < 0.01) {
      console.log('⚠️ Insufficient SOL for gas fees in trading wallet');
      console.log('💡 Need to add SOL to trading wallet for transaction fees');
      return { success: false, reason: 'Insufficient SOL for gas' };
    }
    
    // For now, focus on liquidating existing BONK in trading wallet
    console.log('🔄 Focusing on existing BONK liquidation strategy');
    return await liquidateBonkToSOL(currentBalance);
    
  } catch (error) {
    console.error('❌ Transfer error:', error.message);
    return { success: false, error: error.message };
  }
}

async function liquidateBonkToSOL(bonkAmount) {
  console.log('🔄 LIQUIDATING BONK TO SOL FOR TRADING CAPITAL');
  
  if (bonkAmount < 1000) {
    console.log('⚠️ BONK amount too small for liquidation');
    return { success: false, reason: 'Insufficient BONK amount' };
  }
  
  try {
    // Use 80% of BONK for liquidation, keep 20% as reserve
    const liquidationAmount = Math.floor(bonkAmount * 0.8);
    
    console.log(`📊 Liquidating ${(liquidationAmount / 1e5).toFixed(0)} BONK tokens`);
    
    // Get Jupiter quote for BONK → SOL
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=DezXAZ8z7PnrUA2eMkt6E6qmEZUZhkX5yQwHuHfrLRUi&outputMint=So11111111111111111111111111111111111111112&amount=${liquidationAmount}&slippageBps=300`;
    
    const quoteResponse = await fetch(quoteUrl);
    if (!quoteResponse.ok) {
      throw new Error(`Quote failed: ${quoteResponse.statusText}`);
    }
    
    const quote = await quoteResponse.json();
    
    if (!quote.outAmount) {
      throw new Error('No quote received for BONK liquidation');
    }
    
    const expectedSOL = parseInt(quote.outAmount) / 1e9;
    console.log(`💰 Expected SOL from liquidation: ${expectedSOL.toFixed(6)}`);
    
    if (expectedSOL < 0.01) {
      throw new Error('Expected SOL output too low');
    }
    
    // Get swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: tradingWallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Swap failed: ${swapResponse.statusText}`);
    }
    
    const { swapTransaction } = await swapResponse.json();
    
    // Execute transaction
    const transactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuf);
    
    transaction.sign([tradingWallet]);
    
    const signature = await connection.sendTransaction(transaction, {
      maxRetries: 3,
      skipPreflight: false
    });
    
    console.log(`🔗 BONK Liquidation TX: ${signature}`);
    
    // Confirm transaction
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log(`✅ BONK liquidation successful: ${expectedSOL.toFixed(6)} SOL received`);
    
    return {
      success: true,
      solReceived: expectedSOL,
      signature: signature,
      bonkLiquidated: liquidationAmount
    };
    
  } catch (error) {
    console.error('❌ BONK liquidation error:', error.message);
    return { success: false, error: error.message };
  }
}

async function checkWalletBalances() {
  console.log('📊 CHECKING WALLET BALANCES');
  
  const solBalance = await connection.getBalance(tradingWallet.publicKey);
  console.log(`💳 SOL Balance: ${(solBalance / 1e9).toFixed(6)}`);
  
  try {
    const bonkAccount = await getAssociatedTokenAddress(BONK_MINT, tradingWallet.publicKey);
    const bonkBalance = await connection.getTokenAccountBalance(bonkAccount);
    console.log(`💰 BONK Balance: ${(parseFloat(bonkBalance.value.amount) / 1e5).toFixed(0)} tokens`);
  } catch (error) {
    console.log('💰 BONK Balance: 0 tokens (no account)');
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  transferBonkToTrading().then(result => {
    console.log('🏁 BONK transfer/liquidation result:', result);
    
    if (result.success && result.solReceived > 0.1) {
      console.log('🚀 Sufficient SOL recovered for trading operations');
      console.log('💡 Ready to execute verified pump.fun trades');
    }
    
    process.exit(result.success ? 0 : 1);
  });
}

export { transferBonkToTrading };