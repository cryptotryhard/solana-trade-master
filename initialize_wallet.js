const fetch = require('node-fetch');

async function initializeWallet() {
  try {
    console.log('🔥 INITIALIZING WALLET FOR REAL TRADING...');
    
    const { realTransactionExecutor } = await import('./server/real-transaction-executor.js');
    
    const privateKey = '3qDnPYLuTxdqj8QRx7FWZoH7UhNcUK9LVYQYd6t2D5THUxwsG8jd4QQXkLrM1LzbMK41hpfgSWj3tQ7PRSnV5RFR';
    
    console.log('💰 Setting up wallet with private key...');
    realTransactionExecutor.initializeWallet(privateKey);
    
    const balance = await realTransactionExecutor.getWalletBalance();
    const address = realTransactionExecutor.getWalletAddress();
    
    console.log('✅ WALLET INITIALIZED FOR REAL TRADING');
    console.log('📍 Address:', address);
    console.log('💰 Balance:', balance, 'SOL');
    console.log('🚀 Real trading is now ACTIVE');
    
    return {
      success: true,
      address: address,
      balance: balance,
      message: 'Real trading activated'
    };
    
  } catch (error) {
    console.error('❌ Wallet initialization failed:', error);
    throw error;
  }
}

initializeWallet()
  .then(result => {
    console.log('🎯 RESULT:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 ERROR:', error);
    process.exit(1);
  });