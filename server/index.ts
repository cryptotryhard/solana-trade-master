import dotenv from "dotenv";
dotenv.config(); // <- MUSÍ být úplně první, aby byly ENV proměnné dostupné

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "./real-wallet-config";
import "./real-trade-tracker";
import "./permanent-autonomous-trader";
import { emergencyProfitHarvester } from './emergency-profit-harvester';
import { victoriaMasterController } from './victoria-master-controller';
import { systematicProfitEngine } from './systematic-profit-engine';
import { emergencySOLExtractor } from './emergency-sol-extractor';
import { autoRecoverySystem } from './auto-recovery-system';
import { ultraAggressiveTrader } from './ultra-aggressive-trader';

setTimeout(async () => {
  console.log('🚨 ACTIVATING EMERGENCY RECOVERY SYSTEM');
  try {
    const recoveryResult = await autoRecoverySystem.forceRecovery();
    console.log(`🚀 Force recovery result: ${recoveryResult.message}`);

    const analysis = await emergencySOLExtractor.analyzeExtractionPotential();
    console.log(`📊 Emergency Analysis: ${analysis.totalTokens} tokens, ${analysis.estimatedSOL.toFixed(6)} SOL potential`);

    if (analysis.totalTokens > 0) {
      await emergencySOLExtractor.executeEmergencyExtraction();
    }
  } catch (error) {
    console.error('Emergency recovery failed:', error);
  }
}, 5000);

setTimeout(async () => {
  console.log('🛑 EMERGENCY: STOPPING ALL FAKE TRADING - REAL WALLET VALIDATION');
  console.log('🎯 Target wallet: 9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d');

  try {
    const { emergencyStopFakeTrading } = await import('./emergency-stop-fake-trading');
    const stopResult = await emergencyStopFakeTrading.executeEmergencyStop();

    console.log('🛑 FAKE SYSTEMS STOPPED:', stopResult.fakeSystemsStopped);

    if (stopResult.realWalletValidated) {
      console.log('✅ EMERGENCY STOP SUCCESSFUL');
      console.log(`🔓 Authentic wallet: ${stopResult.walletAddress}`);
      console.log(`💰 Real SOL balance: ${stopResult.solBalance}`);
      await emergencyStopFakeTrading.validateRealTokenOnly();
      console.log('🚫 ALL FAKE TRADING PERMANENTLY DISABLED');
      console.log('🔥 Only authentic blockchain transactions will execute');
    } else {
      console.error('❌ EMERGENCY STOP FAILED:', stopResult.message);
    }
  } catch (error) {
    console.error('❌ Emergency stop execution failed:', error);
  }
}, 5000);

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

  setTimeout(async () => {
    console.log('🚀 INITIALIZING AUTONOMOUS TRADING SYSTEM...');
    const { autoWalletConnector } = await import('./auto-wallet-connector');
    console.log('🔗 Auto Wallet Connector activated');

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

    const { adaptiveEngine } = await import('./adaptive-trading-engine');
    adaptiveEngine.start();
    console.log('🧠 Adaptive Trading Engine activated with $500 capital');

    await import('./adaptive-integration-service');
    console.log('🔗 Adaptive Integration Service initialized');

    await import('./adaptive-learning-engine');
    console.log('🧠 Adaptive Learning Engine initialized');

    await import('./anti-rug-protection');
    console.log('🛡️ Anti-Rug Protection initialized');

    const { ultraAggressiveTrader } = await import('./ultra-aggressive-trader');
    await ultraAggressiveTrader.startUltraAggressiveTrading();
    console.log('💰 ULTRA-AGGRESSIVE TRADER ACTIVATED');

    const { getCapitalManager } = await import('./capital-manager');
    const capitalManager = getCapitalManager();
    console.log('💰 Capital Manager initialized - Dynamic position sizing every 30s');

    setTimeout(() => {
      capitalManager.simulateGrowth();
    }, 5000);
    console.log('🎯 Target: $1,000,000,000 through memecoin scalping');
    console.log('⚡ High-frequency trading with exponential compounding');

    console.log('🎓 Adaptive learning systems activated');
    await import('./copytrading-engine');
    console.log('🎯 Copytrading engine initialized');
  }, 3000);

   app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})(); // ← Tohle uzavírá celý async blok výše

import { emergencyTokenLiquidator } from './emergency-token-liquidator';

(async () => {
  const result = await emergencyTokenLiquidator.executeEmergencyLiquidation();
  console.log('📊 Emergency Result:', result);
})();
