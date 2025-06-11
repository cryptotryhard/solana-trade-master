// Direct MOONSHOT Trade Execution
import fetch from 'node-fetch';

async function executeMoonshotTrade() {
  try {
    console.log('🚀 TRIGGERING MOONSHOT TRADE VIA API');
    
    // Call the trading API to execute MOONSHOT
    const response = await fetch('http://localhost:5000/api/execute-real-trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: 'MOONSHOT',
        mintAddress: 'DEhAasscXF4kEGxFgJ3bq4PpVGp5wyUxMRvn6TzGVHaw',
        amount: 0.1,
        type: 'BUY',
        realExecution: true
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ MOONSHOT TRADE EXECUTED');
      console.log('🔗 TX Hash:', result.txHash);
      console.log('📍 Wallet:', result.senderAddress);
      console.log('💰 Tokens received:', result.amountOut);
      console.log('🌐 Verify on Solscan: https://solscan.io/tx/' + result.txHash);
      return result;
    } else {
      console.error('❌ Trade execution failed:', response.status);
      const error = await response.text();
      console.error('Error details:', error);
    }
    
  } catch (error) {
    console.error('💥 TRADE EXECUTION ERROR:', error);
  }
}

executeMoonshotTrade();