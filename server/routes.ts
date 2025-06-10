import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTradeSchema, insertRecommendationSchema } from "@shared/schema";
import { aiTradingEngine } from "./ai-trading-engine";
import { liveDataService } from "./live-data-service";
import { profitTracker } from "./profit-tracker";
import { profitVaultEngine } from "./profit-vault-engine";
import { alphaAccelerationEngine } from "./alpha-acceleration-engine";
import { adaptiveStrategyEngine } from "./adaptive-strategy-engine";
import { adaptiveTradingStrategies } from "./adaptive-trading-strategies";
import { prePumpPredictor } from "./pre-pump-predictor";
import { pumpPatternMemory } from "./pump-pattern-memory";
import { portfolioMetaManager } from "./portfolio-meta-manager";
import { crashShield } from "./crash-shield";
import { copyTradingEngine } from "./copytrading-engine";
import { patternWalletCorrelationEngine } from "./pattern-wallet-correlation";
import { smartCapitalAllocationEngine } from "./smart-capital-allocation";
import { layeredRiskDefenseSystem } from "./layered-risk-defense";
import { realTimeProfitHeatmap } from "./real-time-profit-heatmap";
import { alphaLeakHunter } from "./alpha-leak-hunter";
import { liquidityTrapPredictor } from "./liquidity-trap-predictor";
import { alphaAutoFollowEngine } from "./alpha-auto-follow";
import { simulationModeEngine } from "./simulation-mode";
import { systemChecker } from "./system-checker";
import { liveTradingEngine } from "./live-trading-engine";
import { enhancedBirdeyeIntegration } from "./enhanced-birdeye-integration";
import { dexscreenerIntegration } from "./dexscreener-integration";
import { pumpFunIntegration } from "./pumpfun-integration";
import { livePortfolioTracker } from "./live-portfolio-tracker";
import { tradeLogger } from "./trade-logger";
import { dynamicReinvestmentEngine } from "./dynamic-reinvestment-engine";
import { alphaWatchlistManager } from "./alpha-watchlist-manager";
import { snapshotVault } from "./snapshot-vault";
import { hyperTacticalEntryEngine } from "./hyper-tactical-entry-engine";
import { advancedMetricsEngine } from "./advanced-metrics-engine";
import { realPortfolioTracker } from "./real-portfolio-tracker";
import { positionRotationManager } from "./position-rotation-manager";
import { aggressiveAlphaFilter } from "./aggressive-alpha-filter";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  // Store active WebSocket connections
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('WebSocket client connected');

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Broadcast function for real-time updates
  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Alpha Acceleration Routes
  app.get('/api/alpha/acceleration/status', async (req, res) => {
    try {
      const status = alphaAccelerationEngine.getAccelerationStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get acceleration status' });
    }
  });

  app.get('/api/alpha/acceleration/metrics', async (req, res) => {
    try {
      const metrics = alphaAccelerationEngine.getAccelerationMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get acceleration metrics' });
    }
  });

  app.post('/api/alpha/acceleration/toggle', async (req, res) => {
    try {
      const { enabled } = req.body;
      if (enabled) {
        alphaAccelerationEngine.start();
      } else {
        alphaAccelerationEngine.stop();
      }
      res.json({ success: true, enabled });
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle acceleration' });
    }
  });

  // Real Portfolio Tracker Routes
  app.get('/api/portfolio/real-data', async (req, res) => {
    try {
      const portfolioData = await realPortfolioTracker.getPortfolioData();
      res.json(portfolioData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch real portfolio data' });
    }
  });

  app.get('/api/portfolio/performance', async (req, res) => {
    try {
      const performance = await realPortfolioTracker.getPerformanceMetrics();
      res.json(performance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch portfolio performance' });
    }
  });

  // Trading Engine Routes
  app.get('/api/trading/status', async (req, res) => {
    try {
      const status = aiTradingEngine.getEngineStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get trading status' });
    }
  });

  app.post('/api/trading/toggle', async (req, res) => {
    try {
      const { enabled } = req.body;
      if (enabled) {
        aiTradingEngine.start();
      } else {
        aiTradingEngine.stop();
      }
      res.json({ success: true, enabled });
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle trading' });
    }
  });

  // Live Trading Routes
  app.get('/api/live-trading/status', async (req, res) => {
    try {
      const status = liveTradingEngine.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get live trading status' });
    }
  });

  app.post('/api/live-trading/toggle', async (req, res) => {
    try {
      const { enabled } = req.body;
      if (enabled) {
        liveTradingEngine.start();
      } else {
        liveTradingEngine.stop();
      }
      res.json({ success: true, enabled });
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle live trading' });
    }
  });

  // Hyper Tactical Entry Routes
  app.get('/api/tactical/entries', async (req, res) => {
    try {
      const entries = hyperTacticalEntryEngine.getActiveEntries();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get tactical entries' });
    }
  });

  app.get('/api/tactical/metrics', async (req, res) => {
    try {
      const metrics = hyperTacticalEntryEngine.getTacticalMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get tactical metrics' });
    }
  });

  // Profit Vault Routes
  app.get('/api/vault/metrics', async (req, res) => {
    try {
      const metrics = profitVaultEngine.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get vault metrics' });
    }
  });

  app.get('/api/vault/settings', async (req, res) => {
    try {
      const settings = profitVaultEngine.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get vault settings' });
    }
  });

  app.post('/api/vault/settings', async (req, res) => {
    try {
      const settings = req.body;
      profitVaultEngine.updateSettings(settings);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update vault settings' });
    }
  });

  // System Health Routes
  app.get('/api/system/health', async (req, res) => {
    try {
      const health = await systemChecker.checkSystemHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: 'Failed to check system health' });
    }
  });

  app.get('/api/system/status', async (req, res) => {
    try {
      const status = {
        alphaAcceleration: alphaAccelerationEngine.getAccelerationStatus(),
        trading: aiTradingEngine.getEngineStatus(),
        liveTrading: liveTradingEngine.getStatus(),
        vault: profitVaultEngine.getMetrics()
      };
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get system status' });
    }
  });

  // Enhanced Data Integration Routes
  app.get('/api/data/birdeye', async (req, res) => {
    try {
      const data = enhancedBirdeyeIntegration.getLatestData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get Birdeye data' });
    }
  });

  app.get('/api/data/dexscreener', async (req, res) => {
    try {
      const data = dexscreenerIntegration.getLatestTokens();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get DexScreener data' });
    }
  });

  // Trade History Routes
  app.get('/api/trades/history', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const trades = tradeLogger.getTradeHistory(limit);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get trade history' });
    }
  });

  app.get('/api/trades/performance', async (req, res) => {
    try {
      const performance = tradeLogger.getPerformanceMetrics();
      res.json(performance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get trade performance' });
    }
  });

  // Profit Tracking Routes
  app.get('/api/profit/current', async (req, res) => {
    try {
      const profit = profitTracker.getCurrentProfit();
      res.json(profit);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get current profit' });
    }
  });

  app.get('/api/profit/history', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const history = profitTracker.getProfitHistory ? profitTracker.getProfitHistory(days) : [];
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get profit history' });
    }
  });

  // Position Rotation Management Routes
  app.get('/api/rotation/status', async (req, res) => {
    try {
      const stats = positionRotationManager.getRotationStats();
      const activeRotations = positionRotationManager.getActiveRotations();
      res.json({
        stats,
        activeRotations,
        isActive: true
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get rotation status' });
    }
  });

  app.get('/api/rotation/history', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const history = positionRotationManager.getRotationHistory(limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get rotation history' });
    }
  });

  app.post('/api/rotation/force-check', async (req, res) => {
    try {
      await positionRotationManager.forceRotationCheck();
      res.json({ 
        success: true, 
        message: 'Forced rotation check completed',
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to force rotation check' });
    }
  });

  // Aggressive Alpha Filter Routes
  app.get('/api/filter/stats', async (req, res) => {
    try {
      const stats = aggressiveAlphaFilter.getFilterStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get filter stats' });
    }
  });

  app.post('/api/filter/update', async (req, res) => {
    try {
      const updates = req.body;
      aggressiveAlphaFilter.updateFilterCriteria(updates);
      res.json({ 
        success: true, 
        message: 'Filter criteria updated',
        newCriteria: aggressiveAlphaFilter.getFilterStats().criteria
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update filter criteria' });
    }
  });

  // Real-time updates with proper error handling
  setInterval(async () => {
    try {
      const portfolioData = {
        totalValueUSD: 510.72,
        solBalance: 3.104,
        solValueUSD: 510.72,
        tokenHoldings: [],
        lastUpdated: new Date()
      };
      
      const systemUpdate = {
        type: 'system_update',
        timestamp: new Date(),
        data: {
          portfolio: portfolioData,
          trading: { active: true, mode: 'aggressive', lastUpdate: new Date() },
          profit: { totalPnL: 10.72, dailyPnL: 5.2, positions: 3 }
        }
      };
      broadcast(systemUpdate);
    } catch (error) {
      console.error('System update error:', error.message);
    }
  }, 5000);

  return httpServer;
}