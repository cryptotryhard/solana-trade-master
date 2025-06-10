import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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
  const server = await registerRoutes(app);
  
  // Auto-activate Alpha Acceleration Mode and Live Trading Engine
  setTimeout(async () => {
    const { alphaAccelerationEngine } = await import('./alpha-acceleration-engine');
    const { liveTradingEngine } = await import('./live-trading-engine');
    
    alphaAccelerationEngine.start();
    await liveTradingEngine.activate();
    
    console.log('⚡ VICTORIA ALPHA ACCELERATION MODE AUTO-ACTIVATED ⚡');
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
    
    // Initialize learning with demo data
    const { learningDemoSimulator } = await import('./learning-demo-simulator');
    await learningDemoSimulator.initializeLearningData();
    await learningDemoSimulator.simulateOngoingLearning();
    console.log('🎓 Learning demo simulator activated');
    
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
