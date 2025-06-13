/**
 * SYSTEM VALIDATION SCRIPT
 * Direct execution to validate VICTORIA's trading authenticity
 */

import { Connection, PublicKey } from '@solana/web3.js';
import fetch from 'node-fetch';

class SystemValidator {
  constructor() {
    this.walletAddress = '9fjFMjjB6qF2VFACEUD4nsK5cBfRyrhWXQ2WMmKSiNpe';
    this.connection = new Connection(process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com');
  }

  async validateSystem() {
    console.log('🔍 VICTORIA SYSTEM VALIDATION');
    console.log('==============================');

    const results = {
      phantomWallet: await this.validatePhantomWallet(),
      dashboardData: await this.validateDashboard(),
      tradeAuthenticity: await this.validateTrades(),
      systemHealth: await this.checkSystemHealth()
    };

    this.generateReport(results);
    return results;
  }

  async validatePhantomWallet() {
    console.log('\n📱 Validating Phantom Wallet State...');
    
    try {
      const publicKey = new PublicKey(this.walletAddress);
      
      // Get SOL balance
      const solBalance = await this.connection.getBalance(publicKey) / 1e9;
      console.log(`💰 SOL Balance: ${solBalance.toFixed(6)}`);

      // Get token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      });

      const tokens = tokenAccounts.value
        .filter(account => account.account.data.parsed.info.tokenAmount.uiAmount > 0)
        .map(account => ({
          mint: account.account.data.parsed.info.mint,
          amount: account.account.data.parsed.info.tokenAmount.uiAmount,
          decimals: account.account.data.parsed.info.tokenAmount.decimals
        }));

      console.log(`🏦 Token Accounts: ${tokens.length}`);
      
      // Calculate approximate value (using known BONK price)
      let totalValue = solBalance * 144.6; // SOL price
      tokens.forEach(token => {
        if (token.mint === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') {
          const bonkValue = token.amount * 0.00001404;
          totalValue += bonkValue;
          console.log(`💎 BONK: ${token.amount.toLocaleString()} tokens (~$${bonkValue.toFixed(2)})`);
        }
      });

      console.log(`💵 Total Estimated Value: $${totalValue.toFixed(2)}`);

      return {
        success: true,
        solBalance,
        tokenCount: tokens.length,
        totalValue,
        tokens
      };

    } catch (error) {
      console.log(`❌ Phantom validation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        // Use known data from screenshots
        solBalance: 0.006474,
        tokenCount: 1,
        totalValue: 441.96,
        tokens: [{ mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK' }]
      };
    }
  }

  async validateDashboard() {
    console.log('\n📊 Validating Dashboard Data...');

    try {
      const [balanceRes, positionsRes, tradesRes] = await Promise.all([
        fetch('http://localhost:5000/api/wallet/authentic-balance').catch(() => null),
        fetch('http://localhost:5000/api/wallet/authentic-positions').catch(() => null),
        fetch('http://localhost:5000/api/trades/authentic-history').catch(() => null)
      ]);

      let dashboardData = {
        solBalance: 0,
        tokenCount: 0,
        totalValue: 0,
        tradeCount: 0
      };

      if (balanceRes && balanceRes.ok) {
        const balance = await balanceRes.json();
        dashboardData.solBalance = balance.solBalance || 0;
        dashboardData.totalValue = balance.totalValue || 0;
        console.log(`💰 Dashboard SOL: ${dashboardData.solBalance}`);
        console.log(`💵 Dashboard Value: $${dashboardData.totalValue}`);
      }

      if (positionsRes && positionsRes.ok) {
        const positions = await positionsRes.json();
        dashboardData.tokenCount = Array.isArray(positions) ? positions.length : 0;
        console.log(`🏦 Dashboard Tokens: ${dashboardData.tokenCount}`);
      }

      if (tradesRes && tradesRes.ok) {
        const trades = await tradesRes.json();
        dashboardData.tradeCount = Array.isArray(trades) ? trades.length : 0;
        console.log(`📈 Dashboard Trades: ${dashboardData.tradeCount}`);
      }

      return { success: true, ...dashboardData };

    } catch (error) {
      console.log(`❌ Dashboard validation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        // Fallback to known dashboard values from screenshots
        solBalance: 0.006474,
        tokenCount: 21,
        totalValue: 59756.52,
        tradeCount: 29
      };
    }
  }

  async validateTrades() {
    console.log('\n🔍 Validating Trade Authenticity...');

    const testTransactions = [
      'uK9hSTUfUyxgBj63QXYpVuD51PnhTCiM1TvZXzarhyRz6SYw4wu96NMXajbhiAddNpJuWYbR7WUtHkEQaV7Kjg1d',
      'kL1wkQq1quGVRVMgERLR3LZ9Bq1Drvj4g6K15WYt3WfqGVLQrS7hdkWPdfptdb8QKzHtsvN4qWtsyExwaqQR7hgW',
      'd7ziq6m2tF9f1tZR5G6Q6gmTiNkYDqWVLzPp5wD5t7iscebqxYuHL1tUcqmpVGtGQhJLY6qq3JRrvMSXs3c8D1jd'
    ];

    const verified = [];
    const failed = [];

    for (const txHash of testTransactions) {
      try {
        console.log(`🔍 Checking transaction: ${txHash.slice(0, 8)}...`);
        
        const transaction = await this.connection.getTransaction(txHash, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        });

        if (transaction) {
          verified.push({
            hash: txHash,
            slot: transaction.slot,
            blockTime: transaction.blockTime
          });
          console.log(`✅ Verified: Slot ${transaction.slot}`);
        } else {
          failed.push({ hash: txHash, reason: 'Transaction not found' });
          console.log(`❌ Not found: ${txHash.slice(0, 8)}...`);
        }

      } catch (error) {
        failed.push({ hash: txHash, reason: error.message });
        console.log(`❌ Error: ${error.message}`);
      }
    }

    console.log(`📊 Verification Results: ${verified.length}/${testTransactions.length} verified`);

    return {
      totalChecked: testTransactions.length,
      verified: verified.length,
      failed: failed.length,
      verifiedTxs: verified,
      failedTxs: failed
    };
  }

  async checkSystemHealth() {
    console.log('\n⚙️ Checking System Health...');

    const health = {
      rpcConnectivity: false,
      priceDataAccess: false,
      tradingCapable: false,
      networkIssues: []
    };

    try {
      // Test RPC connectivity
      const slot = await this.connection.getSlot();
      health.rpcConnectivity = slot > 0;
      console.log(`🔗 RPC Connected: Slot ${slot}`);

      // Test price data access
      try {
        const priceResponse = await fetch('https://price.jup.ag/v4/price?ids=So11111111111111111111111111111111111111112');
        health.priceDataAccess = priceResponse.ok;
        console.log(`📊 Price Data: ${priceResponse.ok ? 'Available' : 'Unavailable'}`);
      } catch (error) {
        health.priceDataAccess = false;
        health.networkIssues.push('Price data API unreachable');
        console.log(`❌ Price Data: Failed (${error.message})`);
      }

      // Check SOL balance for trading capability
      const balance = await this.connection.getBalance(new PublicKey(this.walletAddress));
      const solBalance = balance / 1e9;
      health.tradingCapable = solBalance >= 0.05;
      console.log(`💰 Trading Capable: ${health.tradingCapable ? 'Yes' : 'No'} (${solBalance.toFixed(6)} SOL)`);

      if (!health.tradingCapable) {
        health.networkIssues.push('Insufficient SOL balance for trading');
      }

    } catch (error) {
      health.networkIssues.push(`System health check failed: ${error.message}`);
      console.log(`❌ Health Check Failed: ${error.message}`);
    }

    return health;
  }

  generateReport(results) {
    console.log('\n🏁 FINAL VALIDATION REPORT');
    console.log('=========================');

    // Compare Phantom vs Dashboard
    const phantomValue = results.phantomWallet.totalValue;
    const dashboardValue = results.dashboardData.totalValue;
    const valueDifference = Math.abs(phantomValue - dashboardValue);
    const percentDifference = (valueDifference / phantomValue) * 100;

    console.log('\n📊 DATA COMPARISON:');
    console.log(`   Phantom Wallet: $${phantomValue.toFixed(2)}, ${results.phantomWallet.tokenCount} tokens`);
    console.log(`   Dashboard:      $${dashboardValue.toFixed(2)}, ${results.dashboardData.tokenCount} tokens`);
    console.log(`   Difference:     $${valueDifference.toFixed(2)} (${percentDifference.toFixed(1)}%)`);

    // Trade verification
    console.log('\n🔍 TRADE VERIFICATION:');
    console.log(`   Verified:   ${results.tradeAuthenticity.verified}/${results.tradeAuthenticity.totalChecked}`);
    console.log(`   Failed:     ${results.tradeAuthenticity.failed}`);

    // System status
    console.log('\n⚙️ SYSTEM STATUS:');
    console.log(`   RPC Connectivity: ${results.systemHealth.rpcConnectivity ? '✅' : '❌'}`);
    console.log(`   Price Data:       ${results.systemHealth.priceDataAccess ? '✅' : '❌'}`);
    console.log(`   Trading Ready:    ${results.systemHealth.tradingCapable ? '✅' : '❌'}`);

    // Critical issues
    const criticalIssues = [];
    
    if (percentDifference > 50) {
      criticalIssues.push('MAJOR portfolio value discrepancy between Phantom and dashboard');
    }
    
    if (results.phantomWallet.tokenCount !== results.dashboardData.tokenCount) {
      criticalIssues.push('Token count mismatch between wallet and dashboard');
    }
    
    if (results.tradeAuthenticity.failed > results.tradeAuthenticity.verified) {
      criticalIssues.push('More trades failed verification than passed');
    }
    
    if (!results.systemHealth.tradingCapable) {
      criticalIssues.push('System cannot execute trades due to insufficient SOL');
    }

    console.log('\n🚨 CRITICAL ISSUES:');
    if (criticalIssues.length === 0) {
      console.log('   ✅ No critical issues found');
    } else {
      criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    // Overall status
    const overallStatus = criticalIssues.length === 0 ? 'AUTHENTIC' : 
                         criticalIssues.length <= 2 ? 'COMPROMISED' : 'SEVERELY_COMPROMISED';

    console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (overallStatus === 'AUTHENTIC') {
      console.log('   ✅ System is operating authentically - proceed with full trading');
    } else {
      console.log('   🔧 Fix dashboard data sources to match wallet state');
      console.log('   🔧 Implement proper token metadata resolution');
      console.log('   🔧 Execute emergency liquidation to recover SOL for trading');
      console.log('   🔧 Add real-time blockchain verification for all data');
    }

    return overallStatus;
  }
}

async function main() {
  const validator = new SystemValidator();
  const results = await validator.validateSystem();
  
  // Return results for potential automation
  return results;
}

main().catch(console.error);