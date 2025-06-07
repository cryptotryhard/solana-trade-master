import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTradeSchema, insertRecommendationSchema } from "@shared/schema";
import { aiTradingEngine } from "./ai-trading-engine";

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
      const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h');
      const data = await response.json();
      
      const tokens = data.map((token: any) => ({
        symbol: token.symbol.toUpperCase(),
        name: token.name,
        price: token.current_price,
        change24h: token.price_change_percentage_24h,
        image: token.image
      }));
      
      res.json(tokens);
    } catch (error) {
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
  
  return httpServer;
}
