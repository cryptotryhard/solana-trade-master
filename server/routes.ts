import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTradeSchema, insertRecommendationSchema } from "@shared/schema";
import { aiTradingEngine } from "./ai-trading-engine";
import { liveDataService } from "./live-data-service";
import { profitTracker } from "./profit-tracker";
import { achievementsSystem } from "./achievements-system";
import { profitVaultEngine } from "./profit-vault-engine";
import { alphaAccelerationEngine } from "./alpha-acceleration-engine";
import { adaptiveStrategyEngine } from "./adaptive-strategy-engine";
import { signalOptimizer } from "./signal-optimizer";
import { reinforcementOptimizer } from "./reinforcement-optimizer";
import { adaptiveTradingStrategies } from "./adaptive-trading-strategies";
import { prePumpPredictor } from "./pre-pump-predictor";
import { pumpPatternMemory } from "./pump-pattern-memory";
import { patternPerformanceTracker } from "./pattern-performance-tracker";
import { portfolioMetaManager } from "./portfolio-meta-manager";
import { crashShield } from "./crash-shield";
import { accountIntelligence } from "./account-intelligence";
import { copyTradingEngine } from "./copytrading-engine";
import { patternWalletCorrelationEngine } from "./pattern-wallet-correlation";
import { smartCapitalAllocationEngine } from "./smart-capital-allocation";
import { layeredRiskDefenseSystem } from "./layered-risk-defense";
import { realTimeProfitHeatmap } from "./real-time-profit-heatmap";
import { alphaLeakHunter } from "./alpha-leak-hunter";
import { liquidityTrapPredictor } from "./liquidity-trap-predictor";
import { tradeExplanationGenerator } from "./trade-explanation-generator";

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

  // Real-time portfolio endpoint for connected wallet
  app.get('/api/portfolio/live/:walletAddress', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      // Get wallet SOL balance
      const balanceResponse = await fetch(`${req.protocol}://${req.get('host')}/api/wallet/balance/${walletAddress}`);
      let solBalance = 0;
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        solBalance = balanceData.solBalance;
      }

      // Get SOL price in USD
      const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      let solPrice = 0;
      
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        solPrice = priceData.solana.usd;
      }

      const totalValueUSD = solBalance * solPrice;

      // Get recent trades for this wallet (if any)
      const trades = await storage.getTradesByWallet(walletAddress);
      
      // Calculate P&L from trades
      let totalPnL = 0;
      let activeTrades = 0;
      
      if (trades && trades.length > 0) {
        totalPnL = trades.reduce((sum: number, trade: any) => {
          const pnl = parseFloat(trade.pnl || '0');
          if (trade.side === 'sell' && pnl !== 0) {
            return sum + pnl;
          }
          if (trade.side === 'buy') {
            activeTrades++;
          }
          return sum;
        }, 0);
      }

      const portfolio = {
        walletAddress,
        solBalance,
        solPrice,
        totalValueUSD,
        dailyPnL: totalPnL,
        activeTrades,
        lastUpdated: new Date().toISOString()
      };

      res.json(portfolio);
      
    } catch (error) {
      console.error('Live portfolio fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch live portfolio data' });
    }
  });

  // Adaptive Trading Engine endpoints
  app.get('/api/adaptive-engine/status', async (req, res) => {
    try {
      const { adaptiveEngine } = await import('./adaptive-trading-engine');
      const status = adaptiveEngine.getEngineStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get engine status' });
    }
  });

  app.post('/api/adaptive-engine/analyze', async (req, res) => {
    try {
      const { adaptiveEngine } = await import('./adaptive-trading-engine');
      const tokenData = req.body;
      
      // Validate required fields
      if (!tokenData.symbol || !tokenData.price) {
        return res.status(400).json({ error: 'Missing required token data' });
      }

      const decision = await adaptiveEngine.analyzeToken(tokenData);
      res.json(decision);
    } catch (error) {
      console.error('Token analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze token' });
    }
  });

  app.get('/api/adaptive-engine/decisions', async (req, res) => {
    try {
      const { adaptiveEngine } = await import('./adaptive-trading-engine');
      const limit = parseInt(req.query.limit as string) || 20;
      const decisions = adaptiveEngine.getDecisionHistory(limit);
      res.json(decisions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get decision history' });
    }
  });

  app.post('/api/adaptive-engine/start', async (req, res) => {
    try {
      const { adaptiveEngine } = await import('./adaptive-trading-engine');
      adaptiveEngine.start();
      res.json({ status: 'Engine started successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to start engine' });
    }
  });

  app.post('/api/adaptive-engine/stop', async (req, res) => {
    try {
      const { adaptiveEngine } = await import('./adaptive-trading-engine');
      adaptiveEngine.stop();
      res.json({ status: 'Engine stopped successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop engine' });
    }
  });

  app.post('/api/adaptive-engine/update-capital', async (req, res) => {
    try {
      const { adaptiveEngine } = await import('./adaptive-trading-engine');
      const { totalCapital, profit } = req.body;
      
      if (typeof totalCapital !== 'number') {
        return res.status(400).json({ error: 'Invalid capital amount' });
      }

      adaptiveEngine.updateCapital(totalCapital, profit || 0);
      res.json({ status: 'Capital updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update capital' });
    }
  });

  // Integration Service endpoints
  app.get('/api/adaptive-integration/status', async (req, res) => {
    try {
      const { adaptiveIntegrationService } = await import('./adaptive-integration-service');
      const status = adaptiveIntegrationService.getQueueStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get integration status' });
    }
  });

  app.get('/api/adaptive-integration/queue', async (req, res) => {
    try {
      const { adaptiveIntegrationService } = await import('./adaptive-integration-service');
      const queue = adaptiveIntegrationService.getExecutionQueue();
      res.json(queue);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get execution queue' });
    }
  });

  app.post('/api/adaptive-integration/analyze-token', async (req, res) => {
    try {
      const { adaptiveIntegrationService } = await import('./adaptive-integration-service');
      const tokenData = req.body;
      
      if (!tokenData.symbol) {
        return res.status(400).json({ error: 'Missing token symbol' });
      }

      const decision = await adaptiveIntegrationService.analyzeAlphaToken(tokenData);
      res.json(decision);
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze token' });
    }
  });

  // Learning Engine endpoints
  app.get('/api/learning/metrics', async (req, res) => {
    try {
      const { adaptiveLearningEngine } = await import('./adaptive-learning-engine');
      const metrics = adaptiveLearningEngine.getLearningMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get learning metrics' });
    }
  });

  app.get('/api/learning/patterns', async (req, res) => {
    try {
      const { adaptiveLearningEngine } = await import('./adaptive-learning-engine');
      const patterns = adaptiveLearningEngine.getPatternPerformance();
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get pattern performance' });
    }
  });

  app.get('/api/learning/confidence-history', async (req, res) => {
    try {
      const { adaptiveLearningEngine } = await import('./adaptive-learning-engine');
      const history = adaptiveLearningEngine.getConfidenceThresholdHistory();
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get confidence history' });
    }
  });

  app.post('/api/learning/record-outcome', async (req, res) => {
    try {
      const { adaptiveLearningEngine } = await import('./adaptive-learning-engine');
      const outcome = req.body;
      
      await adaptiveLearningEngine.recordTradeOutcome(outcome);
      res.json({ status: 'Outcome recorded successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to record trade outcome' });
    }
  });

  // Anti-rug protection endpoints
  app.post('/api/security/check-token', async (req, res) => {
    try {
      const { antiRugProtection } = await import('./anti-rug-protection');
      const { mintAddress, symbol } = req.body;
      
      if (!mintAddress) {
        return res.status(400).json({ error: 'Missing mint address' });
      }

      const rugCheck = await antiRugProtection.checkTokenSecurity(mintAddress, symbol);
      res.json(rugCheck);
    } catch (error) {
      res.status(500).json({ error: 'Failed to check token security' });
    }
  });

  app.get('/api/security/blacklist', async (req, res) => {
    try {
      const { antiRugProtection } = await import('./anti-rug-protection');
      const blacklist = antiRugProtection.getBlacklistedAddresses();
      res.json(blacklist);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get blacklist' });
    }
  });

  app.post('/api/security/blacklist/add', async (req, res) => {
    try {
      const { antiRugProtection } = await import('./anti-rug-protection');
      const { mintAddress } = req.body;
      
      if (!mintAddress) {
        return res.status(400).json({ error: 'Missing mint address' });
      }

      antiRugProtection.addToBlacklist(mintAddress);
      res.json({ status: 'Address added to blacklist' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add to blacklist' });
    }
  });

  // Copytrading Engine endpoints
  app.get('/api/copytrading/wallets', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const wallets = copyTradingEngine.getSmartWallets();
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get smart wallets' });
    }
  });

  app.get('/api/copytrading/active-wallets', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const wallets = copyTradingEngine.getActiveWallets();
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get active wallets' });
    }
  });

  app.get('/api/copytrading/recent-trades', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const limit = parseInt(req.query.limit as string) || 20;
      const trades = copyTradingEngine.getRecentTrades(limit);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get recent trades' });
    }
  });

  app.get('/api/copytrading/recent-decisions', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const limit = parseInt(req.query.limit as string) || 20;
      const decisions = copyTradingEngine.getRecentDecisions(limit);
      res.json(decisions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get recent decisions' });
    }
  });

  app.get('/api/copytrading/stats', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const stats = copyTradingEngine.getCopyTradingStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get copytrading stats' });
    }
  });

  app.post('/api/copytrading/add-wallet', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const { address, name, tags } = req.body;
      
      if (!address || !name) {
        return res.status(400).json({ error: 'Missing address or name' });
      }

      const walletId = copyTradingEngine.addSmartWallet(address, name, tags || []);
      res.json({ walletId, status: 'Wallet added successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add wallet' });
    }
  });

  app.delete('/api/copytrading/remove-wallet/:walletId', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const { walletId } = req.params;
      
      const removed = copyTradingEngine.removeSmartWallet(walletId);
      if (removed) {
        res.json({ status: 'Wallet removed successfully' });
      } else {
        res.status(404).json({ error: 'Wallet not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove wallet' });
    }
  });

  app.put('/api/copytrading/update-wallet/:walletId', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const { walletId } = req.params;
      const settings = req.body;
      
      const updated = copyTradingEngine.updateWalletSettings(walletId, settings);
      if (updated) {
        res.json({ status: 'Wallet updated successfully' });
      } else {
        res.status(404).json({ error: 'Wallet not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to update wallet' });
    }
  });

  app.post('/api/copytrading/toggle', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const { active } = req.body;
      
      copyTradingEngine.setActive(active);
      res.json({ 
        status: active ? 'Copytrading activated' : 'Copytrading deactivated',
        isActive: copyTradingEngine.isEngineActive()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle copytrading' });
    }
  });

  app.post('/api/learning/optimize-weights', async (req, res) => {
    try {
      const { adaptiveLearningEngine } = await import('./adaptive-learning-engine');
      // Trigger weight optimization based on performance data
      console.log('Optimizing pattern weights based on performance...');
      res.json({ status: 'Weights optimization triggered' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to optimize weights' });
    }
  });

  app.post('/api/learning/update-weights', async (req, res) => {
    try {
      const { weights } = req.body;
      if (!weights) {
        return res.status(400).json({ error: 'Missing weights data' });
      }
      
      // Update pattern weights manually
      console.log('Updating pattern weights manually:', weights);
      res.json({ status: 'Weights updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update weights' });
    }
  });

  // Extended Copytrading endpoints
  app.post('/api/copytrading/check-eligibility', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const { address } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: 'Missing wallet address' });
      }

      const eligibility = await copyTradingEngine.checkWalletEligibility(address);
      res.json(eligibility);
    } catch (error) {
      res.status(500).json({ error: 'Failed to check wallet eligibility' });
    }
  });

  app.get('/api/copytrading/rankings', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const rankings = copyTradingEngine.getWalletRankings();
      res.json(rankings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get wallet rankings' });
    }
  });

  app.get('/api/copytrading/report/:walletId/:period', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const { walletId, period } = req.params;
      
      if (!['1d', '7d', '30d'].includes(period)) {
        return res.status(400).json({ error: 'Invalid period. Use 1d, 7d, or 30d' });
      }

      const report = copyTradingEngine.generateCopyTradeReport(walletId, period as '1d' | '7d' | '30d');
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  app.get('/api/copytrading/export-reports/:period', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const { period } = req.params;
      
      if (!['1d', '7d', '30d'].includes(period)) {
        return res.status(400).json({ error: 'Invalid period. Use 1d, 7d, or 30d' });
      }

      const reports = copyTradingEngine.exportAllReports(period as '1d' | '7d' | '30d');
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="copytrading-report-${period}.json"`);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export reports' });
    }
  });

  app.get('/api/copytrading/settings', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const settings = copyTradingEngine.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get settings' });
    }
  });

  app.put('/api/copytrading/settings', async (req, res) => {
    try {
      const { copyTradingEngine } = await import('./copytrading-engine');
      const settings = req.body;
      
      copyTradingEngine.updateSettings(settings);
      res.json({ status: 'Settings updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Wallet balance proxy endpoint
  app.get('/api/wallet/balance/:address', async (req, res) => {
    try {
      const { address } = req.params;
      
      if (!address) {
        return res.status(400).json({ error: 'Wallet address required' });
      }

      const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      
      const publicKey = new PublicKey(address);
      
      // Try multiple reliable RPC endpoints
      const rpcEndpoints = [
        "https://api.mainnet-beta.solana.com",
        "https://solana-mainnet.rpc.extrnode.com", 
        "https://rpc.ankr.com/solana"
      ];
      
      let balance = 0;
      let success = false;
      let usedEndpoint = '';
      
      for (const endpoint of rpcEndpoints) {
        try {
          console.log(`Trying to fetch balance from ${endpoint} for ${address}`);
          const connection = new Connection(endpoint, 'confirmed');
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 15000)
          );
          
          const balancePromise = connection.getBalance(publicKey);
          balance = await Promise.race([balancePromise, timeoutPromise]) as number;
          
          success = true;
          usedEndpoint = endpoint;
          console.log(`Successfully fetched balance: ${balance} lamports from ${endpoint}`);
          break;
        } catch (error) {
          console.warn(`Failed to fetch from ${endpoint}:`, (error as Error).message);
          continue;
        }
      }
      
      if (!success) {
        return res.status(503).json({ error: 'Unable to connect to Solana network. Please check your wallet connection or try again later.' });
      }
      
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      res.json({
        address,
        balance,
        solBalance,
        endpoint: usedEndpoint
      });
      
    } catch (error) {
      console.error('Wallet balance fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch wallet balance' });
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

  // Token positions breakdown
  app.get("/api/portfolio/positions", async (req, res) => {
    try {
      const { profitTracker } = await import('./profit-tracker');
      const positions = profitTracker.getPositions();
      
      const positionsWithMetrics = positions.map(position => ({
        ...position,
        priceChange: ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100,
        pnlUsd: position.unrealizedPnL,
        timeHeld: Math.floor((Date.now() - position.entryTime.getTime()) / (1000 * 60)), // minutes
        status: position.unrealizedPnL > 0 ? 'profitable' : position.unrealizedPnL < 0 ? 'losing' : 'flat'
      }));
      
      res.json(positionsWithMetrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get portfolio positions" });
    }
  });

  // Daily trade summary
  app.get("/api/trade/daily-summary", async (req, res) => {
    try {
      const trades = await storage.getTrades(1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayTrades = trades.filter(trade => {
        const tradeDate = new Date(trade.timestamp);
        return tradeDate >= today;
      });
      
      const winningTrades = todayTrades.filter(trade => parseFloat(trade.pnl || '0') > 0);
      const losingTrades = todayTrades.filter(trade => parseFloat(trade.pnl || '0') < 0);
      
      const totalProfit = winningTrades.reduce((sum, trade) => sum + parseFloat(trade.pnl || '0'), 0);
      const totalLoss = losingTrades.reduce((sum, trade) => sum + parseFloat(trade.pnl || '0'), 0);
      const netPnL = totalProfit + totalLoss;
      
      const summary = {
        totalTrades: todayTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate: todayTrades.length > 0 ? (winningTrades.length / todayTrades.length) * 100 : 0,
        totalProfit,
        totalLoss,
        netPnL,
        largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => parseFloat(t.pnl || '0'))) : 0,
        largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => parseFloat(t.pnl || '0'))) : 0,
        averageWin: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
        averageLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0
      };
      
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to get daily trade summary" });
    }
  });

  // Manual trade execution
  app.post("/api/trade/manual", async (req, res) => {
    try {
      const { symbol, action, amount, price } = req.body;
      
      if (!['buy', 'sell'].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'buy' or 'sell'" });
      }
      
      // Create manual trade record
      const trade = await storage.createTrade({
        userId: 1,
        symbol,
        side: action,
        price: price.toString(),
        amount: amount.toString(),
        pnl: '0', // Will be calculated on exit
        confidence: 100, // Manual trade
        timestamp: new Date()
      });
      
      // Record trade with Crash Shield for protection monitoring
      await crashShield.recordTrade({
        userId: 1,
        symbol,
        side: action,
        price: price.toString(),
        amount: amount.toString(),
        pnl: '0',
        confidence: 100,
        portfolioValue: req.body.portfolioValue || 0
      });

      // Record trade with Account Intelligence for audit trail
      await accountIntelligence.recordTrade({
        symbol,
        side: action,
        price: price.toString(),
        amount: amount.toString(),
        pnl: '0',
        confidence: 100,
        signals: ['manual_trade'],
        strategy: 'manual',
        portfolioValue: req.body.portfolioValue || 0
      });
      
      console.log(`📋 Manual ${action.toUpperCase()} order: ${symbol} at $${price} (Amount: ${amount})`);
      
      // Update portfolio if it's a sell order
      if (action === 'sell') {
        const portfolio = await storage.getPortfolio(1);
        const currentBalance = parseFloat(portfolio?.totalBalance || '0');
        const sellValue = amount * price;
        
        await storage.updatePortfolio(1, {
          totalBalance: (currentBalance + sellValue).toString()
        });
      }
      
      res.json({
        success: true,
        trade,
        message: `Manual ${action} order executed successfully`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to execute manual trade" });
    }
  });

  // Achievements system endpoints
  app.get("/api/achievements/status", async (req, res) => {
    try {
      const { achievementsSystem } = await import('./achievements-system');
      const status = await achievementsSystem.getAchievementStatus(1);
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get achievement status" });
    }
  });

  app.get("/api/achievements/check", async (req, res) => {
    try {
      const { achievementsSystem } = await import('./achievements-system');
      const newAchievements = await achievementsSystem.checkNewAchievements(1);
      res.json({ newAchievements });
    } catch (error) {
      res.status(500).json({ message: "Failed to check achievements" });
    }
  });

  // AI suggestion endpoint
  app.post("/api/ai/suggestion", async (req, res) => {
    try {
      const { symbol } = req.body;
      const { aiSuggestionEngine } = await import('./ai-suggestion-engine');
      
      const suggestion = await aiSuggestionEngine.generateTradeSuggestion(symbol);
      res.json(suggestion);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate AI suggestion" });
    }
  });

  // Pre-pump prediction endpoints
  app.post("/api/prepump/analyze", async (req, res) => {
    try {
      const { symbol, mintAddress, sentimentScore } = req.body;
      const prediction = await prePumpPredictor.generatePumpPrediction(symbol, mintAddress, sentimentScore);
      res.json(prediction);
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze pre-pump potential" });
    }
  });

  app.get("/api/prepump/high-readiness", async (req, res) => {
    try {
      const highReadinessTokens = await prePumpPredictor.getHighPumpReadinessTokens();
      res.json(highReadinessTokens);
    } catch (error) {
      res.status(500).json({ message: "Failed to get high readiness tokens" });
    }
  });

  app.get("/api/prepump/score/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const score = prePumpPredictor.getTokenScore(symbol);
      if (score) {
        res.json(score);
      } else {
        res.status(404).json({ message: "Token score not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get token score" });
    }
  });

  app.get("/api/prepump/accuracy", async (req, res) => {
    try {
      const accuracy = prePumpPredictor.getPredictionAccuracy();
      res.json(accuracy);
    } catch (error) {
      res.status(500).json({ message: "Failed to get prediction accuracy" });
    }
  });

  // Pump Pattern Memory endpoints
  app.post("/api/patterns/forecast", async (req, res) => {
    try {
      const { symbol, maturityScore, sentimentScore, context } = req.body;
      const forecast = await pumpPatternMemory.generatePumpPatternForecast(
        symbol,
        maturityScore,
        sentimentScore,
        context
      );
      res.json(forecast);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate pump pattern forecast" });
    }
  });

  app.get("/api/patterns/stats", async (req, res) => {
    try {
      const stats = pumpPatternMemory.getAllPatternStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get pattern statistics" });
    }
  });

  app.get("/api/patterns/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const patterns = pumpPatternMemory.getRecentPatterns(limit);
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recent patterns" });
    }
  });

  app.get("/api/patterns/type/:patternType", async (req, res) => {
    try {
      const { patternType } = req.params;
      const patterns = pumpPatternMemory.getPatternsByType(patternType as any);
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: "Failed to get patterns by type" });
    }
  });

  // Pattern Performance endpoints
  app.get("/api/pattern-performance/metrics", async (req, res) => {
    try {
      const metrics = patternPerformanceTracker.getAllPatternMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get pattern performance metrics" });
    }
  });

  app.get("/api/pattern-performance/top-performers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 3;
      const topPerformers = patternPerformanceTracker.getTopPerformingPatterns(limit);
      res.json(topPerformers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get top performing patterns" });
    }
  });

  app.get("/api/pattern-performance/adjustments", async (req, res) => {
    try {
      const marketCondition = (req.query.market as string) || 'trending';
      const adjustments = patternPerformanceTracker.generateStrategyAdjustments(marketCondition as any);
      res.json(adjustments);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate strategy adjustments" });
    }
  });

  app.post("/api/pattern-performance/toggle-adaptation", async (req, res) => {
    try {
      const { enabled } = req.body;
      patternPerformanceTracker.setAdaptationEnabled(enabled);
      res.json({ adaptationEnabled: enabled });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle pattern adaptation" });
    }
  });

  app.get("/api/pattern-performance/recent-trades", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const recentTrades = patternPerformanceTracker.getRecentTrades(limit);
      res.json(recentTrades);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recent trades" });
    }
  });

  // Profit vault endpoints
  app.get("/api/vault/status", async (req, res) => {
    try {
      const status = await profitVaultEngine.getVaultStatus(1);
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get vault status" });
    }
  });

  // Achievements system routes
  app.get("/api/achievements/status", async (req, res) => {
    try {
      const status = await achievementsSystem.getAchievementStatus(1);
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get achievement status" });
    }
  });

  app.get("/api/achievements", async (req, res) => {
    try {
      const achievements = achievementsSystem.getAllAchievements();
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Failed to get achievements" });
    }
  });

  // Portfolio Meta-Manager endpoints
  app.get("/api/portfolio/meta/regime", async (req, res) => {
    try {
      const regime = portfolioMetaManager.getCurrentRegime();
      res.json(regime);
    } catch (error) {
      res.status(500).json({ message: "Failed to get portfolio regime" });
    }
  });

  app.get("/api/portfolio/meta/aggression", async (req, res) => {
    try {
      const aggression = portfolioMetaManager.getCurrentAggression();
      res.json(aggression);
    } catch (error) {
      res.status(500).json({ message: "Failed to get aggression level" });
    }
  });

  app.get("/api/portfolio/meta/metrics", async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 4;
      const metrics = portfolioMetaManager.getRecentMetrics(hours);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get portfolio metrics" });
    }
  });

  app.get("/api/portfolio/meta/adjustments", async (req, res) => {
    try {
      const adjustments = portfolioMetaManager.getAdjustmentHistory();
      res.json(adjustments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get adjustment history" });
    }
  });

  app.post("/api/portfolio/meta/toggle", async (req, res) => {
    try {
      const { active } = req.body;
      portfolioMetaManager.setActive(active);
      res.json({ success: true, active });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle meta manager" });
    }
  });

  app.post("/api/portfolio/meta/force-analysis", async (req, res) => {
    try {
      const mockMetrics = req.body.metrics || {};
      await portfolioMetaManager.forceRegimeAnalysis(mockMetrics);
      res.json({ success: true, message: "Portfolio regime analysis triggered" });
    } catch (error) {
      res.status(500).json({ message: "Failed to trigger regime analysis" });
    }
  });

  // Crash Shield Auto-Protect endpoints
  app.get("/api/crash-shield/status", async (req, res) => {
    try {
      const status = crashShield.getProtectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get protection status" });
    }
  });

  app.get("/api/crash-shield/threat-level", async (req, res) => {
    try {
      const threatLevel = await crashShield.assessThreatLevel();
      res.json(threatLevel);
    } catch (error) {
      res.status(500).json({ message: "Failed to assess threat level" });
    }
  });

  app.get("/api/crash-shield/safe-mode", async (req, res) => {
    try {
      const safeModeConfig = crashShield.getSafeModeConfig();
      res.json(safeModeConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to get safe mode config" });
    }
  });

  app.get("/api/crash-shield/triggers", async (req, res) => {
    try {
      const triggers = crashShield.getPanicTriggers();
      res.json(triggers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get panic triggers" });
    }
  });

  app.get("/api/crash-shield/capital-locks", async (req, res) => {
    try {
      const locks = crashShield.getCapitalLocks();
      res.json(locks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get capital locks" });
    }
  });

  app.get("/api/crash-shield/events", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const events = crashShield.getProtectionEvents(limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to get protection events" });
    }
  });

  app.post("/api/crash-shield/toggle", async (req, res) => {
    try {
      const { enabled } = req.body;
      crashShield.setEnabled(enabled);
      res.json({ success: true, enabled });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle crash shield" });
    }
  });

  app.post("/api/crash-shield/force-safe-mode", async (req, res) => {
    try {
      const { reason } = req.body;
      await crashShield.forceSafeMode(reason || "Manual activation");
      res.json({ success: true, message: "Safe mode activated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to activate safe mode" });
    }
  });

  app.post("/api/crash-shield/manual-recovery", async (req, res) => {
    try {
      await crashShield.manualRecovery();
      res.json({ success: true, message: "Manual recovery initiated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to initiate recovery" });
    }
  });

  app.put("/api/crash-shield/trigger/:triggerId", async (req, res) => {
    try {
      const { triggerId } = req.params;
      const updates = req.body;
      const success = crashShield.updateTrigger(triggerId, updates);
      
      if (success) {
        res.json({ success: true, message: "Trigger updated" });
      } else {
        res.status(404).json({ message: "Trigger not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update trigger" });
    }
  });

  // Account Intelligence & Audit System endpoints
  app.get("/api/account/performance/:period", async (req, res) => {
    try {
      const period = req.params.period as '24h' | '7d' | '30d';
      const metrics = await accountIntelligence.getPerformanceMetrics(period);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get performance metrics" });
    }
  });

  app.get("/api/account/performance-history", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const history = accountIntelligence.getPerformanceHistory(days);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to get performance history" });
    }
  });

  app.get("/api/account/token-leaderboard", async (req, res) => {
    try {
      const leaderboard = await accountIntelligence.getTokenPerformanceLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to get token leaderboard" });
    }
  });

  app.get("/api/account/risk-events", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = accountIntelligence.getRiskEvents(limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to get risk events" });
    }
  });

  app.get("/api/account/trade-journal", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const journal = accountIntelligence.getTradeJournal(limit);
      res.json(journal);
    } catch (error) {
      res.status(500).json({ message: "Failed to get trade journal" });
    }
  });

  app.get("/api/account/strategy-transitions", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const transitions = accountIntelligence.getStrategyTransitions(limit);
      res.json(transitions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get strategy transitions" });
    }
  });

  app.get("/api/account/export-journal", async (req, res) => {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const exportData = await accountIntelligence.exportTradeJournal(format);
      
      const filename = `victoria_trade_journal_${new Date().toISOString().split('T')[0]}.${format}`;
      const contentType = format === 'csv' ? 'text/csv' : 'application/json';
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', contentType);
      res.send(exportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export trade journal" });
    }
  });

  app.post("/api/account/record-risk-event", async (req, res) => {
    try {
      const event = req.body;
      await accountIntelligence.recordRiskEvent(event);
      res.json({ success: true, message: "Risk event recorded" });
    } catch (error) {
      res.status(500).json({ message: "Failed to record risk event" });
    }
  });

  app.post("/api/account/record-strategy-transition", async (req, res) => {
    try {
      const transition = req.body;
      await accountIntelligence.recordStrategyTransition(transition);
      res.json({ success: true, message: "Strategy transition recorded" });
    } catch (error) {
      res.status(500).json({ message: "Failed to record strategy transition" });
    }
  });

  app.post("/api/vault/settings", async (req, res) => {
    try {
      const updatedSettings = await profitVaultEngine.updateVaultSettings(1, req.body);
      res.json(updatedSettings);
    } catch (error) {
      res.status(400).json({ message: "Failed to update vault settings" });
    }
  });

  app.get("/api/vault/profit", async (req, res) => {
    try {
      const { profitVaultEngine } = await import('./profit-vault-engine');
      const { amount = 1000 } = req.query;
      const analysis = await profitVaultEngine.calculateOptimalAllocation(1, parseFloat(amount.toString()));
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate optimal allocation" });
    }
  });

  app.post("/api/vault/simulate", async (req, res) => {
    try {
      const { profitVaultEngine } = await import('./profit-vault-engine');
      const { amount, days, strategy } = req.body;
      const simulation = await profitVaultEngine.simulateVaultGrowth(amount, days, strategy);
      res.json(simulation);
    } catch (error) {
      res.status(500).json({ message: "Failed to simulate vault growth" });
    }
  });

  // Adaptive Strategy Engine endpoints
  app.get("/api/adaptive/metrics", async (req, res) => {
    try {
      const metrics = await adaptiveStrategyEngine.getAdaptiveMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get adaptive metrics" });
    }
  });

  app.get("/api/adaptive/weights", async (req, res) => {
    try {
      const weights = adaptiveStrategyEngine.getCurrentWeights();
      res.json(weights);
    } catch (error) {
      res.status(500).json({ message: "Failed to get strategy weights" });
    }
  });

  app.get("/api/adaptive/signals", async (req, res) => {
    try {
      const signals = adaptiveStrategyEngine.getSignalSources();
      res.json(signals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get signal sources" });
    }
  });

  app.post("/api/adaptive/exit-trade", async (req, res) => {
    try {
      const { tradeId, exitPrice, reason } = req.body;
      await adaptiveStrategyEngine.recordTradeExit(tradeId, exitPrice, reason);
      res.json({ success: true, message: "Trade exit recorded" });
    } catch (error) {
      res.status(500).json({ message: "Failed to record trade exit" });
    }
  });

  app.post("/api/adaptive/settings", async (req, res) => {
    try {
      const { minTradesForLearning, rebalanceInterval, learningMode } = req.body;
      adaptiveStrategyEngine.setLearningParameters({
        minTradesForLearning,
        rebalanceInterval,
        learningMode
      });
      res.json({ success: true, message: "Learning parameters updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update learning parameters" });
    }
  });

  // Signal Optimizer endpoints
  app.get("/api/signals/subtypes", async (req, res) => {
    try {
      const subtypes = await signalOptimizer.getSignalSubtypes();
      res.json(subtypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get signal subtypes" });
    }
  });

  app.get("/api/signals/heatmap", async (req, res) => {
    try {
      const heatmap = await signalOptimizer.getPerformanceHeatmap();
      res.json(heatmap);
    } catch (error) {
      res.status(500).json({ message: "Failed to get performance heatmap" });
    }
  });

  app.get("/api/signals/combinations", async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const combinations = await signalOptimizer.getTopPerformingCombinations(Number(limit));
      res.json(combinations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get signal combinations" });
    }
  });

  app.get("/api/signals/optimization-report", async (req, res) => {
    try {
      const report = await signalOptimizer.getSignalOptimizationReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to get optimization report" });
    }
  });

  app.post("/api/signals/optimize", async (req, res) => {
    try {
      await signalOptimizer.optimizeSignalWeights();
      res.json({ success: true, message: "Signal weights optimized" });
    } catch (error) {
      res.status(500).json({ message: "Failed to optimize signal weights" });
    }
  });

  // Reinforcement Optimizer endpoints
  app.get("/api/reinforcement/status", async (req, res) => {
    try {
      const status = await reinforcementOptimizer.getOptimizationStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get reinforcement status" });
    }
  });

  app.get("/api/reinforcement/history", async (req, res) => {
    try {
      const history = await reinforcementOptimizer.getOptimizationHistory();
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to get optimization history" });
    }
  });

  app.post("/api/reinforcement/optimize", async (req, res) => {
    try {
      await reinforcementOptimizer.forceOptimization();
      res.json({ success: true, message: "Reinforcement optimization triggered" });
    } catch (error) {
      res.status(500).json({ message: "Failed to trigger reinforcement optimization" });
    }
  });

  app.post("/api/reinforcement/settings", async (req, res) => {
    try {
      const { intervalHours, explorationRate } = req.body;
      if (intervalHours) reinforcementOptimizer.setOptimizationInterval(intervalHours);
      if (explorationRate !== undefined) reinforcementOptimizer.setExplorationRate(explorationRate);
      res.json({ success: true, message: "Reinforcement settings updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update reinforcement settings" });
    }
  });

  // Adaptive Trading Strategies endpoints
  app.get("/api/strategies/matrix", async (req, res) => {
    try {
      const matrix = await adaptiveTradingStrategies.getStrategyMatrix();
      res.json(matrix);
    } catch (error) {
      res.status(500).json({ message: "Failed to get strategy matrix" });
    }
  });

  app.get("/api/strategies/recommendations/:clusterId", async (req, res) => {
    try {
      const { clusterId } = req.params;
      const recommendations = await adaptiveTradingStrategies.getStrategyRecommendations(clusterId);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get strategy recommendations" });
    }
  });

  app.get("/api/strategies/executions", async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const executions = adaptiveTradingStrategies.getExecutionHistory(Number(limit));
      res.json(executions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get execution history" });
    }
  });

  app.post("/api/strategies/optimize", async (req, res) => {
    try {
      await adaptiveTradingStrategies.optimizeAllStrategies();
      res.json({ success: true, message: "Strategy optimization triggered" });
    } catch (error) {
      res.status(500).json({ message: "Failed to optimize strategies" });
    }
  });

  app.post("/api/strategies/learning", async (req, res) => {
    try {
      const { enabled } = req.body;
      adaptiveTradingStrategies.setLearningMode(enabled);
      res.json({ success: true, message: `Learning mode ${enabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
      res.status(500).json({ message: "Failed to update learning mode" });
    }
  });

  // Alpha Acceleration Engine endpoints
  app.post("/api/alpha/activate", async (req, res) => {
    try {
      await alphaAccelerationEngine.startAlphaMode();
      res.json({ success: true, message: "Alpha Acceleration Mode activated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to activate Alpha mode" });
    }
  });

  app.post("/api/alpha/deactivate", async (req, res) => {
    try {
      alphaAccelerationEngine.stopAlphaMode();
      res.json({ success: true, message: "Alpha Acceleration Mode deactivated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate Alpha mode" });
    }
  });

  app.get("/api/alpha/status", async (req, res) => {
    try {
      const status = alphaAccelerationEngine.getAlphaStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get Alpha status" });
    }
  });

  app.get("/api/alpha/positions", async (req, res) => {
    try {
      const positions = alphaAccelerationEngine.getLayeredPositions();
      res.json(positions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get layered positions" });
    }
  });

  app.get("/api/alpha/tokens", async (req, res) => {
    try {
      // Get recent alpha tokens with confidence data
      const alphaTokens = await alphaAccelerationEngine.getRecentAlphaTokens();
      res.json(alphaTokens);
    } catch (error) {
      res.status(500).json({ message: "Failed to get alpha tokens" });
    }
  });

  app.post("/api/alpha/settings", async (req, res) => {
    try {
      await alphaAccelerationEngine.adjustAlphaSettings(req.body);
      res.json({ success: true, message: "Alpha settings updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update Alpha settings" });
    }
  });

  app.get("/api/leaderboard/shadow", async (req, res) => {
    try {
      const status = alphaAccelerationEngine.getAlphaStatus();
      res.json({ 
        shadowingEnabled: status.active,
        walletsTracked: status.leaderboardWallets,
        recentShadowTrades: []
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get shadow trading status" });
    }
  });
  
  // Pattern-Wallet Correlation Routes
  app.get('/api/pattern-correlation/wallet-styles', (req, res) => {
    try {
      const styles = patternWalletCorrelationEngine.getWalletStyles();
      res.json(styles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get wallet styles' });
    }
  });

  app.get('/api/pattern-correlation/patterns', (req, res) => {
    try {
      const patterns = patternWalletCorrelationEngine.getPatternDatabase();
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get patterns' });
    }
  });

  app.post('/api/pattern-correlation/analyze-token', async (req, res) => {
    try {
      const tokenData = req.body;
      const matches = await patternWalletCorrelationEngine.analyzeTokenForPatterns(tokenData);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze token patterns' });
    }
  });

  // Smart Capital Allocation Routes
  app.get('/api/capital/allocation-params', (req, res) => {
    try {
      const params = smartCapitalAllocationEngine.getAllocationParameters();
      res.json(params);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get allocation parameters' });
    }
  });

  app.put('/api/capital/allocation-params', (req, res) => {
    try {
      smartCapitalAllocationEngine.updateAllocationParameters(req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update allocation parameters' });
    }
  });

  app.get('/api/capital/portfolio-metrics', (req, res) => {
    try {
      const metrics = smartCapitalAllocationEngine.getPortfolioMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get portfolio metrics' });
    }
  });

  app.post('/api/capital/calculate-allocation', async (req, res) => {
    try {
      const { tokenData, confidenceScore, patternStrength, walletPerformance } = req.body;
      const allocation = await smartCapitalAllocationEngine.calculateOptimalAllocation(
        tokenData, 
        confidenceScore, 
        patternStrength || 0, 
        walletPerformance || 0
      );
      res.json(allocation);
    } catch (error) {
      res.status(500).json({ error: 'Failed to calculate allocation' });
    }
  });

  app.get('/api/capital/allocation-summary', (req, res) => {
    try {
      const summary = smartCapitalAllocationEngine.getAllocationSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get allocation summary' });
    }
  });

  // Risk Defense Routes
  app.post('/api/risk/assess-token', async (req, res) => {
    try {
      const tokenData = req.body;
      const assessment = await layeredRiskDefenseSystem.assessTokenRisk(tokenData);
      res.json(assessment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to assess token risk' });
    }
  });

  app.get('/api/risk/token-score/:mintAddress', (req, res) => {
    try {
      const mintAddress = req.params.mintAddress;
      const score = layeredRiskDefenseSystem.getTokenRiskScore(mintAddress);
      res.json(score);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get token risk score' });
    }
  });

  app.get('/api/risk/report', (req, res) => {
    try {
      const report = layeredRiskDefenseSystem.generateRiskReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate risk report' });
    }
  });

  // Profit Heatmap Routes
  app.get('/api/heatmap/data', (req, res) => {
    try {
      const heatmapData = realTimeProfitHeatmap.getHeatmapData();
      res.json(heatmapData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get heatmap data' });
    }
  });

  app.get('/api/heatmap/top-performers', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topPerformers = realTimeProfitHeatmap.getTopPerformers(limit);
      res.json(topPerformers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get top performers' });
    }
  });

  app.get('/api/heatmap/hottest', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const hottestItems = realTimeProfitHeatmap.getHottestItems(limit);
      res.json(hottestItems);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get hottest items' });
    }
  });

  app.get('/api/heatmap/metrics/:period?', (req, res) => {
    try {
      const period = (req.params.period as '1h' | '6h' | '24h') || '24h';
      const metrics = realTimeProfitHeatmap.getProfitMetrics(period);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get profit metrics' });
    }
  });

  app.get('/api/heatmap/global', (req, res) => {
    try {
      const globalHeatmap = realTimeProfitHeatmap.getGlobalHeatmap();
      res.json(globalHeatmap);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get global heatmap' });
    }
  });

  // Alpha Leak Hunter Routes
  app.get('/api/alpha-radar/leaks', (req, res) => {
    try {
      const leaks = alphaLeakHunter.getActiveLeaks();
      res.json(leaks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get alpha leaks' });
    }
  });

  app.get('/api/alpha-radar/leaks/high-confidence', (req, res) => {
    try {
      const minConfidence = parseInt(req.query.minConfidence as string) || 75;
      const leaks = alphaLeakHunter.getHighConfidenceLeaks(minConfidence);
      res.json(leaks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get high confidence leaks' });
    }
  });

  app.get('/api/alpha-radar/leaks/urgent', (req, res) => {
    try {
      const maxTime = parseInt(req.query.maxTime as string) || 30;
      const leaks = alphaLeakHunter.getUrgentLeaks(maxTime);
      res.json(leaks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get urgent leaks' });
    }
  });

  app.get('/api/alpha-radar/stats', (req, res) => {
    try {
      const stats = alphaLeakHunter.getHuntingStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get hunting stats' });
    }
  });

  // Liquidity Trap Predictor Routes
  app.get('/api/liquidity-traps/active', (req, res) => {
    try {
      const traps = liquidityTrapPredictor.getActiveTraps();
      res.json(traps);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get active traps' });
    }
  });

  app.get('/api/liquidity-traps/critical', (req, res) => {
    try {
      const traps = liquidityTrapPredictor.getCriticalTraps();
      res.json(traps);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get critical traps' });
    }
  });

  app.get('/api/liquidity-traps/check/:mintAddress', (req, res) => {
    try {
      const mintAddress = req.params.mintAddress;
      const result = liquidityTrapPredictor.isTokenSafe(mintAddress);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to check token safety' });
    }
  });

  app.get('/api/liquidity-traps/stats', (req, res) => {
    try {
      const stats = liquidityTrapPredictor.getTrapStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get trap stats' });
    }
  });

  // Trade Explanation Routes
  app.get('/api/trade-explanations/recent', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const explanations = tradeExplanationGenerator.getRecentExplanations(limit);
      res.json(explanations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get recent explanations' });
    }
  });

  app.get('/api/trade-explanations/:tradeId', (req, res) => {
    try {
      const tradeId = req.params.tradeId;
      const explanation = tradeExplanationGenerator.getExplanation(tradeId);
      if (explanation) {
        res.json(explanation);
      } else {
        res.status(404).json({ error: 'Explanation not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to get trade explanation' });
    }
  });

  app.get('/api/trade-explanations/stats', (req, res) => {
    try {
      const stats = tradeExplanationGenerator.getExplanationStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get explanation stats' });
    }
  });

  app.post('/api/trade-explanations/generate', async (req, res) => {
    try {
      const { tradeId, symbol, side, amount, price, context } = req.body;
      const explanation = await tradeExplanationGenerator.generateExplanation(
        tradeId, symbol, side, amount, price, context
      );
      res.json(explanation);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate trade explanation' });
    }
  });

  return httpServer;
}
