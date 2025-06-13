/**
 * MANUAL TEST TRADE - Verify Complete Trading Cycle
 * Execute 0.03 SOL test purchase with real-time monitoring
 */

async function executeManualTestTrade() {
  try {
    console.log('🧪 Executing manual 0.03 SOL test trade...');
    
    const response = await fetch('http://localhost:5000/api/streamlined/test-trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Test trade executed successfully!');
      console.log('📊 Trade Details:', result.trade);
      console.log('💰 Entry Amount:', result.trade.entryAmount, 'SOL');
      console.log('🪙 Tokens Received:', result.trade.tokensReceived.toFixed(0));
      console.log('🔗 TX Hash:', result.trade.entryTxHash);
      
      // Monitor position status
      console.log('\n📈 Monitoring position for exit conditions...');
      await monitorTestPosition(result.trade.id);
    } else {
      console.error('❌ Test trade failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error executing test trade:', error.message);
  }
}

async function monitorTestPosition(tradeId) {
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch('http://localhost:5000/api/streamlined/stats');
      const stats = await response.json();
      
      console.log(`📊 Monitoring attempt ${attempts + 1}/${maxAttempts}`);
      console.log(`💼 Active positions: ${stats.activePositions || 0}`);
      
      if (stats.activePositions === 0) {
        console.log('🎯 Position has been closed! Checking for exit details...');
        break;
      }
      
      await delay(3000); // Wait 3 seconds
      attempts++;
    } catch (error) {
      console.error('❌ Error monitoring position:', error.message);
      break;
    }
  }
  
  if (attempts >= maxAttempts) {
    console.log('⏰ Monitoring timeout reached');
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute the test
executeManualTestTrade();