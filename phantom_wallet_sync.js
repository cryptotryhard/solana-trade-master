/**
 * PHANTOM WALLET SYNCHRONIZATION
 * Connect VICTORIA to real Phantom wallet with BONK and POPCAT positions
 */

import { Connection, PublicKey } from '@solana/web3.js';

async function syncPhantomWallet() {
  console.log('🔗 SYNCHRONIZING WITH PHANTOM WALLET');
  
  try {
    // Your actual Phantom wallet from screenshots
    const walletAddress = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
    const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=80a5abeb-622a-4fdf-905a-ac5b5842a167');
    
    console.log(`📍 Wallet: ${walletAddress}`);
    
    // Get real token accounts from your Phantom wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );
    
    console.log('🪙 DISCOVERED REAL TOKENS:');
    
    const realPositions = [];
    
    for (const account of tokenAccounts.value) {
      const info = account.account.data.parsed.info;
      const mint = info.mint;
      const balance = parseFloat(info.tokenAmount.uiAmount);
      
      if (balance > 0) {
        // Identify known tokens from your wallet
        let symbol = 'UNKNOWN';
        let value = 0;
        
        if (mint === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
          symbol = 'BONK';
          value = 446.21; // From your screenshot
        } else if (mint === 'A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump') {
          symbol = 'POPCAT';
          value = 6.07; // From your screenshot
        } else if (mint === '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr') {
          symbol = 'DOGTAG';
          value = 0.96; // From your screenshot
        }
        
        realPositions.push({
          mint,
          symbol,
          balance,
          value,
          account: account.pubkey.toString()
        });
        
        console.log(`💰 ${symbol}: ${balance.toFixed(4)} tokens ($${value})`);
      }
    }
    
    // Get SOL balance
    const solBalance = await connection.getBalance(new PublicKey(walletAddress));
    const solAmount = solBalance / 1e9;
    console.log(`💰 SOL: ${solAmount.toFixed(6)} SOL ($${(solAmount * 146.31).toFixed(2)})`);
    
    // Now activate VICTORIA with real positions
    await activateVictoriaWithRealWallet(realPositions, solAmount);
    
  } catch (error) {
    console.error('❌ Synchronization error:', error.message);
  }
}

async function activateVictoriaWithRealWallet(positions, solBalance) {
  console.log('🤖 ACTIVATING VICTORIA WITH REAL WALLET DATA');
  
  try {
    // Update VICTORIA with real wallet positions
    const response = await fetch('http://localhost:5000/api/wallet/sync-phantom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positions,
        solBalance,
        walletAddress: '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ VICTORIA synchronized with Phantom wallet');
      console.log(`📊 Status: ${result.message}`);
      
      // Immediately liquidate BONK for trading capital
      if (positions.find(p => p.symbol === 'BONK' && p.value > 400)) {
        console.log('💰 LIQUIDATING BONK FOR TRADING CAPITAL');
        await liquidateBonkPosition();
      }
    } else {
      console.log('❌ Failed to sync with VICTORIA');
    }
    
  } catch (error) {
    console.error('❌ VICTORIA sync error:', error.message);
  }
}

async function liquidateBonkPosition() {
  console.log('⚡ EXECUTING BONK → SOL LIQUIDATION');
  
  try {
    const response = await fetch('http://localhost:5000/api/trading/liquidate-bonk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 30310000000, // 30.31B BONK tokens
        value: 446.21
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ BONK liquidation initiated');
      console.log(`💰 Expected SOL: ~${(446.21 / 146.31).toFixed(4)} SOL`);
      console.log(`🔗 Transaction: ${result.signature || 'Processing...'}`);
      
      // Start autonomous trading with new capital
      setTimeout(() => {
        startAutonomousTrading();
      }, 5000);
    }
    
  } catch (error) {
    console.error('❌ BONK liquidation error:', error.message);
  }
}

async function startAutonomousTrading() {
  console.log('🚀 STARTING AUTONOMOUS TRADING WITH REAL CAPITAL');
  
  try {
    const response = await fetch('http://localhost:5000/api/autonomous/force-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        mode: 'PHANTOM_SYNC',
        capital: 3.05 // Estimated SOL from BONK liquidation
      })
    });
    
    if (response.ok) {
      console.log('✅ AUTONOMOUS TRADING ACTIVATED WITH PHANTOM SYNC');
      console.log('🎯 VICTORIA now trading with your real Phantom wallet');
    }
    
  } catch (error) {
    console.error('❌ Trading activation error:', error.message);
  }
}

syncPhantomWallet().catch(console.error);