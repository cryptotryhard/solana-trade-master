import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "./real-wallet-config"; // Load real wallet configuration first
import "./real-trade-tracker"; // Initialize VICTORIA's trade tracking
import { emergencyProfitHarvester } from './emergency-profit-harvester';
import { victoriaMasterController } from './victoria-master-controller';
import { systematicProfitEngine } from './systematic-profit-engine';

// Activate emergency SOL extraction on startup
import { emergencySOLExtractor } from './emergency-sol-extractor';
setTimeout(async () => {
  console.log('🚀 ACTIVATING EMERGENCY SOL EXTRACTION');
  try {
    const analysis = await emergencySOLExtractor.analyzeExtractionPotential();
    console.log(`📊 Emergency Analysis: ${analysis.totalTokens} tokens, ${analysis.estimatedSOL.toFixed(6)} SOL potential`);
    
    if (analysis.totalTokens > 0) {
      await emergencySOLExtractor.executeEmergencyExtraction();
    }
  } catch (error) {
    console.error('Emergency extraction failed:', error);
  }
}, 10000);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  registerRoutes(app);
  
  const server = createServer(app);
  
  // Initialize Autonomous Trading System
  setTimeout(async () => {
    console.log('🚀 INITIALIZING AUTONOMOUS TRADING SYSTEM...');
    
    // Activate automatic wallet connector for immediate live trading
    const { autoWalletConnector } = await import('./auto-wallet-connector');
    console.log('🔗 Auto Wallet Connector activated');
    
    // Activate autonomous trading controller
    const { autonomousTradingController } = await import('./autonomous-trading-controller');
    await autonomousTradingController.activateTrading();
    
    console.log('✅ AUTONOMOUS TRADING ACTIVATED');
    console.log('💰 WALLET: 9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d');
    console.log('🎯 REAL-TIME OPPORTUNITIES SCANNING');
    console.log('⚡ AI-DRIVEN POSITION MANAGEMENT');
    console.log('📊 CONTINUOUS PROFIT OPTIMIZATION');
    
    const { jupiterRealExecutor } = await import('./jupiter-real-executor');
    console.log('🔥 JUPITER REAL EXECUTOR ACTIVE');
    console.log('🚀 EXECUTING FIRST REAL TRADE...');
    console.log('🎯 Target: Exponential Growth to $1B Portfolio');
    console.log('🔥 Ultra-aggressive scanning: pump.fun every 20 seconds');
    console.log('📈 Layered position stacking: Up to 3 layers per token');
    console.log('💎 Auto-compounding: 85% profit reinvestment');
    console.log('🚀 LIVE TRADING ENGINE ACTIVATED - Real Jupiter swaps enabled');
    console.log('👥 Shadow trading: Top 50 wallets monitored');
    
    // Start adaptive trading engine
    const { adaptiveEngine } = await import('./adaptive-trading-engine');
    adaptiveEngine.start();
    console.log('🧠 Adaptive Trading Engine activated with $500 capital');
    
    // Initialize integration service
    await import('./adaptive-integration-service');
    console.log('🔗 Adaptive Integration Service initialized');
    
    // Initialize learning engine
    await import('./adaptive-learning-engine');
    console.log('🧠 Adaptive Learning Engine initialized');
    
    // Initialize anti-rug protection
    await import('./anti-rug-protection');
    console.log('🛡️ Anti-Rug Protection initialized');
    
    // Initialize Ultra-Aggressive Trader for $1B target
    const { ultraAggressiveTrader } = await import('./ultra-aggressive-trader');
    await ultraAggressiveTrader.startTrading();
    console.log('💰 ULTRA-AGGRESSIVE TRADER ACTIVATED');
    console.log('🎯 Target: $1,000,000,000 through memecoin scalping');
    console.log('⚡ High-frequency trading with exponential compounding');
    
    // Learning system integrated within adaptive engines
    console.log('🎓 Adaptive learning systems activated');
    
    // Initialize copytrading engine
    await import('./copytrading-engine');
    console.log('🎯 Copytrading engine initialized');
  }, 3000); // Activate after 3 seconds

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
