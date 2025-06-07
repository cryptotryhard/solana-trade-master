import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTradeSchema, insertRecommendationSchema } from "@shared/schema";

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
  
  // Simulate periodic AI recommendations and trades
  setInterval(async () => {
    const symbols = ['BONK', 'WIF', 'SAMO', 'ORCA', 'RAY'];
    const actions = ['buy', 'sell', 'hold'];
    const reasons = [
      'Strong momentum detected with volume spike',
      'Technical indicators show oversold conditions',
      'Breaking through key resistance level',
      'Consolidation pattern forming',
      'Bearish divergence on RSI'
    ];
    
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    const randomReason = reasons[Math.floor(Math.random() * reasons.length)];
    const confidence = Math.floor(Math.random() * 30) + 70; // 70-100
    
    try {
      const recommendation = await storage.createRecommendation({
        symbol: randomSymbol,
        action: randomAction,
        confidence,
        reason: randomReason
      });
      
      broadcast({ type: 'NEW_RECOMMENDATION', data: recommendation });
    } catch (error) {
      console.error('Failed to create periodic recommendation:', error);
    }
  }, 60000); // Every minute
  
  return httpServer;
}
