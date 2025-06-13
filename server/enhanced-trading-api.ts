/**
 * ENHANCED TRADING API
 * Comprehensive endpoints for optimized dashboard with real data
 */

import { Router } from 'express';
import { capitalProtectionSystem } from './capital-protection-system';
import { profitHarvestScheduler } from './profit-harvest-scheduler';
import { ultraVolatilityAI } from './ultra-volatility-ai-system';

const router = Router();

// Real trade history with ROI tracking
router.get('/api/trades/history', async (req, res) => {
  try {
    const tradeHistory = ultraAggressiveTrader.getTradeHistory();
    
    const formattedTrades = tradeHistory.slice(-20).map((trade, index) => ({
      id: `trade_${index + 1}`,
      symbol: trade.symbol || 'UNKNOWN',
      type: trade.type || 'buy',
      amount: trade.amount || 0,
      solSpent: trade.solAmount || 0,
      price: 200,
      txHash: trade.txHash || '',
      timestamp: trade.timestamp || new Date().toISOString(),
      status: trade.txHash ? 'confirmed' : 'pending',
      roi: calculateTradeROI(trade),
      profit: trade.profit || 0,
      confidence: trade.confidence || 0,
      marketCap: trade.marketCap || 0
    })).reverse();
    
    res.json(formattedTrades);
  } catch (error) {
    console.error('Trade history error:', error);
    res.json([]);
  }
});

// Capital protection status
router.get('/api/capital-protection/status', async (req, res) => {
  try {
    const status = capitalProtectionSystem.getProtectionStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Protection status unavailable' });
  }
});

// Profit harvest scheduler status
router.get('/api/profit-harvest/status', async (req, res) => {
  try {
    const status = profitHarvestScheduler.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Harvest status unavailable' });
  }
});

// Ultra-volatility AI insights
router.get('/api/volatility-ai/status', async (req, res) => {
  try {
    const insights = ultraVolatilityAI.getVolatilityInsights();
    const reactionHistory = ultraVolatilityAI.getReactionHistory(10);
    
    res.json({
      ...insights,
      recentReactions: reactionHistory
    });
  } catch (error) {
    res.status(500).json({ error: 'AI insights unavailable' });
  }
});

// Comprehensive portfolio overview
router.get('/api/portfolio/comprehensive', async (req, res) => {
  try {
    const walletBalance = await walletManager.getBalance();
    const tokens = await walletManager.getTokenBalances();
    const stats = ultraAggressiveTrader.getStats();
    const tradeHistory = ultraAggressiveTrader.getTradeHistory();
    
    // Calculate real metrics
    const solValue = walletBalance * 200;
    const tokenValue = tokens.reduce((sum, token) => {
      const estimatedValue = estimateTokenValue(token.mint, token.balance);
      return sum + (estimatedValue * 200);
    }, 0);
    
    const totalPortfolioValue = solValue + tokenValue;
    const initialCapital = 500;
    const totalROI = ((totalPortfolioValue - initialCapital) / initialCapital) * 100;
    
    // Trading performance metrics
    const totalTrades = tradeHistory.length;
    const profitableTrades = tradeHistory.filter(t => (t.profit || 0) > 0).length;
    const successRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
    
    // Recent performance
    const last24hTrades = tradeHistory.filter(t => {
      const tradeTime = new Date(t.timestamp || 0);
      return Date.now() - tradeTime.getTime() < 24 * 60 * 60 * 1000;
    });
    
    const dailyPnL = last24hTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    
    const overview = {
      // Portfolio basics
      totalValue: totalPortfolioValue,
      solBalance: walletBalance,
      solValue: solValue,
      tokenValue: tokenValue,
      tokenCount: tokens.length,
      
      // Performance metrics
      totalROI: totalROI,
      totalTrades: totalTrades,
      successRate: successRate,
      dailyPnL: dailyPnL,
      profitableTrades: profitableTrades,
      
      // Progress indicators
      progressToTarget: Math.min((totalPortfolioValue / 750) * 100, 100),
      progressToSOLTarget: Math.min((walletBalance / 0.5) * 100, 100),
      
      // Trading mode
      tradingMode: determineTradeMode(walletBalance, totalPortfolioValue),
      canTrade: walletBalance >= 0.02,
      
      // Protection status
      protectionLevel: getProtectionLevel(walletBalance),
      emergencyMode: walletBalance < 0.01,
      
      // AI insights
      volatilityMode: ultraVolatilityAI.getVolatilityInsights().emergencyMode,
      
      // Next actions
      recommendations: generateRecommendations(walletBalance, totalPortfolioValue, totalROI)
    };
    
    res.json(overview);
  } catch (error) {
    console.error('Portfolio overview error:', error);
    res.status(500).json({ error: 'Portfolio data unavailable' });
  }
});

// Recent transaction details with profit tracking
router.get('/api/recent-transactions', async (req, res) => {
  try {
    const tradeHistory = ultraAggressiveTrader.getTradeHistory();
    
    const recentTransactions = tradeHistory.slice(-15).map((trade, index) => ({
      id: `tx_${index}`,
      type: trade.type || 'buy',
      symbol: trade.symbol || 'UNKNOWN',
      amount: trade.solAmount || 0,
      tokens: trade.tokensReceived || 0,
      txHash: trade.txHash || '',
      timestamp: trade.timestamp || new Date().toISOString(),
      status: trade.txHash ? 'confirmed' : 'pending',
      profit: trade.profit || 0,
      roi: calculateTradeROI(trade),
      slippage: trade.slippage || 0,
      confidence: trade.confidence || 0
    })).reverse();
    
    res.json(recentTransactions);
  } catch (error) {
    res.json([]);
  }
});

// Helper functions
function calculateTradeROI(trade: any): number {
  if (!trade.solAmount || trade.solAmount === 0) return 0;
  const profit = trade.profit || 0;
  return (profit / trade.solAmount) * 100;
}

function estimateTokenValue(mint: string, balance: number): number {
  // Simple estimation - replace with actual market data
  const readableBalance = balance / 1e6;
  if (readableBalance > 1000000) return 0.01;
  if (readableBalance > 100000) return 0.005;
  if (readableBalance > 10000) return 0.001;
  return 0.0001;
}

function determineTradeMode(solBalance: number, totalValue: number): string {
  if (solBalance < 0.01) return 'EMERGENCY_RECOVERY';
  if (solBalance < 0.1) return 'CONSERVATIVE';
  if (totalValue >= 750) return 'AGGRESSIVE_EXPANSION';
  return 'GROWTH';
}

function getProtectionLevel(solBalance: number): string {
  if (solBalance < 0.01) return 'CRITICAL';
  if (solBalance < 0.05) return 'HIGH';
  if (solBalance < 0.1) return 'MEDIUM';
  return 'SAFE';
}

function generateRecommendations(solBalance: number, totalValue: number, roi: number): string[] {
  const recommendations: string[] = [];
  
  if (solBalance < 0.02) {
    recommendations.push('Priority: Liquidate token positions for SOL recovery');
  }
  
  if (roi < -50) {
    recommendations.push('Consider reducing position sizes until recovery');
  }
  
  if (totalValue >= 750) {
    recommendations.push('Target reached - activate profit harvest protocol');
  }
  
  if (solBalance >= 0.5) {
    recommendations.push('Sufficient capital - enable aggressive trading mode');
  }
  
  return recommendations;
}

export default router;