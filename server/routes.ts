import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTradeSchema, insertRecommendationSchema } from "@shared/schema";
import { aiTradingEngine } from "./ai-trading-engine";
import { liveDataService } from "./live-data-service";
import { profitTracker } from "./profit-tracker";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected to WebSocket');
    
    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });
  });
  
  // Broadcast to all connected clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  // Portfolio endpoints
  app.get("/api/portfolio/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const portfolio = await storage.getPortfolio(userId);
      
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      
      res.json(portfolio);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });
  
  // Trades endpoints
  app.get("/api/trades", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const trades = await storage.getTrades(userId);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });
  
  app.get("/api/trades/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const trades = await storage.getRecentTrades(limit);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent trades" });
    }
  });
  
  app.post("/api/trades", async (req, res) => {
    try {
      const tradeData = insertTradeSchema.parse(req.body);
      const trade = await storage.createTrade(tradeData);
      
      // Broadcast new trade to all connected clients
      broadcast({ type: 'NEW_TRADE', data: trade });
      
      res.json(trade);
    } catch (error) {
      res.status(400).json({ message: "Invalid trade data" });
    }
  });
  
  // AI Recommendations endpoints
  app.get("/api/recommendations", async (req, res) => {
    try {
      const recommendations = await storage.getRecommendations();
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });
  
  app.post("/api/recommendations", async (req, res) => {
    try {
      const recData = insertRecommendationSchema.parse(req.body);
      const recommendation = await storage.createRecommendation(recData);
      
      // Broadcast new recommendation to all connected clients
      broadcast({ type: 'NEW_RECOMMENDATION', data: recommendation });
      
      res.json(recommendation);
    } catch (error) {
      res.status(400).json({ message: "Invalid recommendation data" });
    }
  });
  
  // Crypto price endpoints (using external APIs)
  app.get("/api/prices/solana", async (req, res) => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true');
      const data = await response.json();
      res.json({
        symbol: 'SOL',
        price: data.solana.usd,
        change24h: data.solana.usd_24h_change
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Solana price" });
    }
  });
  
  app.get("/api/prices/top-tokens", async (req, res) => {
    try {
      const tokens = await liveDataService.getTopMemecoins();
      
      const formattedTokens = tokens.map(token => ({
        symbol: token.symbol,
        name: token.name,
        price: token.price,
        change24h: token.priceChange24h,
        image: `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${token.mintAddress}/logo.png`
      }));
      
      res.json(formattedTokens);
    } catch (error) {
      console.error('Failed to fetch memecoin data:', error);
      res.status(500).json({ message: "Failed to fetch token prices" });
    }
  });
  
  // AI Trading Engine Status endpoint
  app.get("/api/bot/status", async (req, res) => {
    try {
      const status = aiTradingEngine.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bot status" });
    }
  });

  // Control AI Trading Bot
  app.post("/api/bot/control", async (req, res) => {
    try {
      const { action, maxTradeSize, stopLoss } = req.body;
      
      if (action === 'start') {
        aiTradingEngine.startEngine();
      } else if (action === 'stop') {
        aiTradingEngine.stopEngine();
      }
      
      if (maxTradeSize) {
        aiTradingEngine.setMaxTradeSize(maxTradeSize);
      }
      
      if (stopLoss) {
        aiTradingEngine.setStopLoss(stopLoss);
      }
      
      res.json({ success: true, status: aiTradingEngine.getStatus() });
    } catch (error) {
      res.status(500).json({ message: "Failed to control bot" });
    }
  });

  // Wallet connection endpoint
  app.post("/api/wallet/connect", async (req, res) => {
    try {
      const { userId, walletAddress, balance } = req.body;
      
      // Update user with wallet info
      const user = await storage.getUser(userId);
      if (user) {
        // In a real implementation, you'd update the user record
        res.json({ success: true, walletAddress, balance });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to connect wallet" });
    }
  });

  // Portfolio analytics endpoint
  app.get("/api/portfolio/analytics/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const metrics = await profitTracker.getDetailedPortfolioReport();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get portfolio analytics" });
    }
  });

  // Live token data endpoint  
  app.get("/api/tokens/live", async (req, res) => {
    try {
      const tokens = await liveDataService.getTopMemecoins();
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch live token data" });
    }
  });

  // Jupiter swap quote endpoint
  app.post("/api/swap/quote", async (req, res) => {
    try {
      const { inputMint, outputMint, amount, slippage } = req.body;
      const { jupiterIntegration } = await import('./jupiter-integration');
      
      const quote = await jupiterIntegration.getQuote(inputMint, outputMint, amount, slippage || 300);
      
      if (quote) {
        res.json(quote);
      } else {
        res.status(400).json({ message: "No route found for this swap" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get swap quote" });
    }
  });

  // Execute Jupiter swap
  app.post("/api/swap/execute", async (req, res) => {
    try {
      const { inputMint, outputMint, amount, userPublicKey, slippage } = req.body;
      const { jupiterIntegration } = await import('./jupiter-integration');
      
      const result = await jupiterIntegration.executeSwap(inputMint, outputMint, amount, userPublicKey, slippage || 300);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to execute swap" });
    }
  });

  // Pump.fun scanner endpoint
  app.get("/api/pump-fun/scan", async (req, res) => {
    try {
      const { pumpFunScanner } = await import('./pump-fun-scanner');
      const tokens = await pumpFunScanner.scanAndAnalyze();
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ message: "Failed to scan pump.fun" });
    }
  });

  // AI trading controls
  app.post("/api/trading/aggressive-mode", async (req, res) => {
    try {
      const { enabled, maxPositionSize } = req.body;
      
      if (enabled) {
        aiTradingEngine.setMaxTradeSize(maxPositionSize || 15);
        console.log(`🚀 AGGRESSIVE MODE ENABLED: Max position size ${maxPositionSize}%`);
      }
      
      res.json({ success: true, aggressiveMode: enabled });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle aggressive mode" });
    }
  });

  // Momentum leaderboard endpoints
  app.get("/api/momentum/leaderboard", async (req, res) => {
    try {
      const { momentumLeaderboard } = await import('./momentum-leaderboard');
      const leaderboard = momentumLeaderboard.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to get momentum leaderboard" });
    }
  });

  app.get("/api/momentum/top-gainers", async (req, res) => {
    try {
      const { momentumLeaderboard } = await import('./momentum-leaderboard');
      const topGainers = momentumLeaderboard.getTopGainers(10);
      res.json(topGainers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get top gainers" });
    }
  });

  app.get("/api/momentum/emerging-alpha", async (req, res) => {
    try {
      const { momentumLeaderboard } = await import('./momentum-leaderboard');
      const emergingAlpha = momentumLeaderboard.getEmergingAlpha();
      res.json(emergingAlpha);
    } catch (error) {
      res.status(500).json({ message: "Failed to get emerging alpha" });
    }
  });

  // Capital scaling metrics
  app.get("/api/scaling/metrics", async (req, res) => {
    try {
      const { capitalScalingEngine } = await import('./capital-scaling-engine');
      const metrics = await capitalScalingEngine.getScalingReport();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get scaling metrics" });
    }
  });

  // Security analysis endpoint
  app.post("/api/security/analyze", async (req, res) => {
    try {
      const { tokenData } = req.body;
      const { antiRugFilter } = await import('./anti-rug-filter');
      const analysis = await antiRugFilter.analyzeTokenSecurity(tokenData);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze token security" });
    }
  });

  // Advanced portfolio analytics
  app.get("/api/portfolio/advanced/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { advancedExitStrategy } = await import('./advanced-exit-strategy');
      
      // Get comprehensive portfolio data
      const portfolio = await storage.getPortfolio(userId);
      const trades = await storage.getTrades(userId);
      const metrics = await profitTracker.getDetailedPortfolioReport();
      
      res.json({
        portfolio,
        trades: trades.slice(0, 50), // Last 50 trades
        metrics,
        activePositions: metrics.positions || []
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get advanced portfolio analytics" });
    }
  });

  // Trend prediction endpoint
  app.post("/api/trend/predict", async (req, res) => {
    try {
      const { symbol } = req.body;
      const { trendPredictor } = await import('./trend-predictor');
      
      const prediction = await trendPredictor.predictShortTermPump(symbol);
      res.json(prediction);
    } catch (error) {
      res.status(500).json({ message: "Failed to predict trend" });
    }
  });

  app.get("/api/trend/top-candidates", async (req, res) => {
    try {
      const { trendPredictor } = await import('./trend-predictor');
      const candidates = await trendPredictor.getTopPumpCandidates(5);
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ message: "Failed to get pump candidates" });
    }
  });

  // Portfolio growth simulation
  app.get("/api/simulate/growth", async (req, res) => {
    try {
      const { portfolioSimulator } = await import('./portfolio-simulator');
      const projections = await portfolioSimulator.getComprehensiveProjections();
      res.json(projections);
    } catch (error) {
      res.status(500).json({ message: "Failed to simulate growth" });
    }
  });

  app.post("/api/simulate/custom", async (req, res) => {
    try {
      const { days, config } = req.body;
      const { portfolioSimulator } = await import('./portfolio-simulator');
      
      const projection = await portfolioSimulator.simulateGrowth(days, config);
      res.json(projection);
    } catch (error) {
      res.status(500).json({ message: "Failed to run custom simulation" });
    }
  });

  // Strategy management
  app.get("/api/strategy/current", async (req, res) => {
    try {
      const { strategyManager } = await import('./strategy-manager');
      const strategy = strategyManager.getCurrentStrategy();
      const metrics = strategyManager.getStrategyMetrics();
      
      res.json({ strategy, metrics });
    } catch (error) {
      res.status(500).json({ message: "Failed to get current strategy" });
    }
  });

  app.post("/api/strategy/mode", async (req, res) => {
    try {
      const { mode } = req.body;
      const { strategyManager } = await import('./strategy-manager');
      
      if (!['conservative', 'balanced', 'hyper-aggressive'].includes(mode)) {
        return res.status(400).json({ message: "Invalid strategy mode" });
      }
      
      const newStrategy = await strategyManager.setStrategy(mode);
      const metrics = strategyManager.getStrategyMetrics();
      
      console.log(`🎯 Strategy changed to ${mode} mode`);
      
      res.json({ 
        success: true, 
        strategy: newStrategy,
        metrics,
        message: `Strategy updated to ${mode} mode`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update strategy mode" });
    }
  });

  app.post("/api/strategy/auto-optimize", async (req, res) => {
    try {
      const { strategyManager } = await import('./strategy-manager');
      const optimizedStrategy = await strategyManager.autoOptimizeStrategy();
      const metrics = strategyManager.getStrategyMetrics();
      
      res.json({ 
        strategy: optimizedStrategy,
        metrics,
        message: "Strategy auto-optimized based on performance"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to auto-optimize strategy" });
    }
  });

  // Emergency controls
  app.post("/api/emergency/activate", async (req, res) => {
    try {
      const { strategyManager } = await import('./strategy-manager');
      await strategyManager.activateEmergencyMode();
      
      console.log('🚨 Emergency mode activated via API');
      
      res.json({ 
        success: true,
        message: "Emergency mode activated - capital preservation priority"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to activate emergency mode" });
    }
  });

  // Telegram notification controls
  app.post("/api/notifications/toggle", async (req, res) => {
    try {
      const { enabled } = req.body;
      const { telegramNotifier } = await import('./telegram-notifier');
      
      telegramNotifier.toggleNotifications(enabled);
      
      res.json({ 
        success: true,
        enabled: telegramNotifier.isEnabled(),
        message: `Telegram notifications ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle notifications" });
    }
  });

  app.get("/api/notifications/status", async (req, res) => {
    try {
      const { telegramNotifier } = await import('./telegram-notifier');
      
      res.json({ 
        enabled: telegramNotifier.isEnabled()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get notification status" });
    }
  });
  
  return httpServer;
}
