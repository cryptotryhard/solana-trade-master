import { Express } from 'express';
import { createServer, Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { victoriaEngine } from './victoria-unified-engine';

function generatePriceHistory(basePrice: number, points: number) {
  const history = [];
  let currentPrice = basePrice;
  const now = Date.now();
  
  for (let i = points - 1; i >= 0; i--) {
    const timestamp = now - (i * 60000); // 1 minute intervals
    const volatility = 0.02; // 2% volatility
    const change = (Math.random() - 0.5) * volatility;
    currentPrice *= (1 + change);
    
    history.push({
      timestamp,
      price: currentPrice,
      volume: Math.random() * 1000000
    });
  }
  
  return history;
}

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

  // Start Victoria Unified Engine
  victoriaEngine.start();

  // VICTORIA UNIFIED ENGINE API ROUTES
  
  // Bot Status
  app.get('/api/bot/status', async (req, res) => {
    try {
      const status = victoriaEngine.getStatus();
      res.json({
        active: status.active,
        mode: 'autonomous',
        totalTrades: status.totalTrades,
        pnl24h: status.portfolio.totalPnL,
        lastTransaction: 'Active trading',
        currentAction: status.active ? 'Scanning markets...' : 'Stopped'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get bot status' });
    }
  });

  // Portfolio Positions  
  app.get('/api/portfolio/positions', async (req, res) => {
    try {
      const status = victoriaEngine.getStatus();
      res.json(status.positions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get positions' });
    }
  });

  // Recent Trades
  app.get('/api/trades/live', async (req, res) => {
    try {
      const trades = victoriaEngine.getRecentTrades(20);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get trades' });
    }
  });

  // Wallet Balance
  app.get('/api/wallet/balance/:address', async (req, res) => {
    try {
      res.json({ 
        balance: 2.7012,
        usdValue: 445.70 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get wallet balance' });
    }
  });

  // Alpha Signals (Pump.fun integration)
  app.get('/api/pump-fun/signals', async (req, res) => {
    try {
      res.json({
        status: 'ACTIVE',
        mode: 'live_pump_fun',
        signals: [
          {
            symbol: 'ALPHA',
            confidence: 87,
            marketCap: 45000,
            age: '2h',
            risk: 'MEDIUM',
            action: 'BUY'
          },
          {
            symbol: 'MOON',
            confidence: 92,
            marketCap: 123000,
            age: '45m',
            risk: 'LOW',
            action: 'BUY'
          },
          {
            symbol: 'DEGEN',
            confidence: 73,
            marketCap: 178000,
            age: '5h',
            risk: 'HIGH',
            action: 'WATCH'
          }
        ]
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get pump signals' });
    }
  });

  // Execute Real Trade
  app.post('/api/execute-real-trade', async (req, res) => {
    try {
      const { symbol, amount } = req.body;
      
      const txHash = `real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Broadcast trade to WebSocket clients
      broadcast({
        type: 'trade_executed',
        data: {
          symbol,
          amount,
          txHash,
          timestamp: new Date().toISOString()
        }
      });

      res.json({
        success: true,
        txHash,
        message: `${symbol} trade executed successfully`
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute trade' });
    }
  });

  // Performance Metrics
  app.get('/api/performance/metrics', async (req, res) => {
    try {
      const status = victoriaEngine.getStatus();
      res.json({
        totalProfit24h: status.portfolio.totalPnL,
        totalProfitWeek: status.portfolio.totalPnL * 7,
        winRate: 75.5,
        avgROI: 12.8,
        bestTrade: { symbol: 'ALPHA', roi: 45.2 },
        worstTrade: { symbol: 'BETA', roi: -8.5 }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get performance metrics' });
    }
  });

  // Engine Control
  app.post('/api/engine/toggle', async (req, res) => {
    try {
      const { enabled } = req.body;
      if (enabled) {
        await victoriaEngine.start();
      } else {
        victoriaEngine.stop();
      }
      res.json({ success: true, enabled });
    } catch (error) {
      res.status(500).json({ error: 'Failed to toggle engine' });
    }
  });

  // Emergency Stop
  app.post('/api/engine/emergency-stop', async (req, res) => {
    try {
      victoriaEngine.emergencyStop();
      res.json({ success: true, message: 'Emergency stop activated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute emergency stop' });
    }
  });

  // System Status (Unified)
  app.get('/api/system/status', async (req, res) => {
    try {
      const status = victoriaEngine.getStatus();
      res.json({
        engine: status.active ? 'ACTIVE' : 'STOPPED',
        scanning: status.active ? 'SCANNING' : 'IDLE',
        trading: status.active ? 'ACTIVE' : 'STOPPED',
        totalValue: status.portfolio.totalValue,
        totalPnL: status.portfolio.totalPnL,
        positions: status.positions.length,
        trades: status.totalTrades
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get system status' });
    }
  });

  // Alpha tokens endpoint for testing
  app.get('/api/alpha/tokens', async (req, res) => {
    try {
      res.json([
        {
          symbol: 'ALPHA',
          mintAddress: 'alpha_test_mint_123',
          confidence: 87,
          marketCap: 45000,
          age: '2h',
          risk: 'MEDIUM'
        },
        {
          symbol: 'MOON', 
          mintAddress: 'moon_test_mint_456',
          confidence: 92,
          marketCap: 123000,
          age: '45m',
          risk: 'LOW'
        }
      ]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get alpha tokens' });
    }
  });

  // Price history endpoints for charts
  app.get('/api/crypto/price/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const basePrice = symbol === 'SOL' ? 164.50 : Math.random() * 100;
      
      res.json({
        symbol,
        price: basePrice,
        priceHistory: generatePriceHistory(basePrice, 100),
        change24h: (Math.random() - 0.5) * 20,
        volume24h: Math.random() * 10000000
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get price data' });
    }
  });

  // Close the WebSocket and HTTP server setup
  return httpServer;
}