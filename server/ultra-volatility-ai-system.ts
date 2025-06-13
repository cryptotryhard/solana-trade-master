/**
 * ULTRA-VOLATILITY AI SYSTEM
 * AI-based reactions for pump and rug alerts in volatile markets
 */

import OpenAI from 'openai';
import { EventEmitter } from 'events';

interface MarketSignal {
  type: 'pump' | 'rug' | 'flash_crash' | 'whale_move' | 'volume_spike';
  token: string;
  severity: number; // 1-10
  confidence: number; // 0-100%
  data: any;
  timestamp: Date;
}

interface VolatilityMetrics {
  priceChange1m: number;
  priceChange5m: number;
  volumeSpike: number;
  liquidityChange: number;
  whaleActivity: boolean;
  rugProbability: number;
}

interface AIReaction {
  action: 'buy' | 'sell' | 'hold' | 'emergency_exit' | 'scale_in' | 'scale_out';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  positionSize: number;
  reasoning: string;
  confidence: number;
}

class UltraVolatilityAISystem extends EventEmitter {
  private openai: OpenAI;
  private isActive: boolean = false;
  private reactionHistory: { signal: MarketSignal; reaction: AIReaction; timestamp: Date }[] = [];
  private emergencyMode: boolean = false;

  constructor() {
    super();
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.initializeAISystem();
  }

  private initializeAISystem(): void {
    console.log('🤖 Initializing Ultra-Volatility AI System');
    this.isActive = true;
    
    // Start real-time monitoring
    setInterval(() => {
      this.scanForVolatilitySignals();
    }, 2000); // Check every 2 seconds for rapid response
  }

  private async scanForVolatilitySignals(): Promise<void> {
    if (!this.isActive) return;

    try {
      // Simulate real market scanning (replace with actual market data APIs)
      const signals = await this.detectMarketSignals();
      
      for (const signal of signals) {
        if (signal.severity >= 7) { // High severity signals
          const reaction = await this.generateAIReaction(signal);
          await this.executeVolatilityReaction(signal, reaction);
        }
      }
    } catch (error) {
      console.log('AI volatility scan error:', error.message);
    }
  }

  private async detectMarketSignals(): Promise<MarketSignal[]> {
    // Mock high-volatility signals for demonstration
    const currentTime = new Date();
    const signals: MarketSignal[] = [];

    // Simulate pump detection
    if (Math.random() > 0.98) {
      signals.push({
        type: 'pump',
        token: 'PEPE2',
        severity: 8,
        confidence: 92,
        data: {
          priceChange1m: 45,
          volume: 2500000,
          buyers: 450
        },
        timestamp: currentTime
      });
    }

    // Simulate rug detection
    if (Math.random() > 0.995) {
      signals.push({
        type: 'rug',
        token: 'SCAM_TOKEN',
        severity: 10,
        confidence: 88,
        data: {
          liquidityRemoved: 95,
          priceDrops: -85,
          devWallet: 'dumping'
        },
        timestamp: currentTime
      });
    }

    // Simulate volume spike
    if (Math.random() > 0.95) {
      signals.push({
        type: 'volume_spike',
        token: 'CHAD',
        severity: 6,
        confidence: 85,
        data: {
          volumeIncrease: 340,
          newHolders: 120,
          socialMentions: 850
        },
        timestamp: currentTime
      });
    }

    return signals;
  }

  private async generateAIReaction(signal: MarketSignal): Promise<AIReaction> {
    const prompt = `
    Analyze this high-volatility market signal and provide an optimal trading reaction:

    Signal Type: ${signal.type}
    Token: ${signal.token}
    Severity: ${signal.severity}/10
    Confidence: ${signal.confidence}%
    Data: ${JSON.stringify(signal.data)}

    Current Portfolio Context:
    - Available SOL: ~0.5 SOL
    - Active Positions: 8-10 tokens
    - Recent Performance: Mixed (some positions profitable)
    - Risk Tolerance: Aggressive but with capital protection

    Provide reaction in JSON format:
    {
      "action": "buy|sell|hold|emergency_exit|scale_in|scale_out",
      "urgency": "low|medium|high|critical",
      "positionSize": 0.1-1.0,
      "reasoning": "detailed explanation",
      "confidence": 0-100
    }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert crypto trading AI specialized in ultra-high-frequency volatile market reactions. Respond with optimal trading decisions in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 300
      });

      const aiReaction = JSON.parse(response.choices[0].message.content);
      
      return {
        action: aiReaction.action || 'hold',
        urgency: aiReaction.urgency || 'medium',
        positionSize: Math.min(Math.max(aiReaction.positionSize || 0.1, 0.05), 0.5),
        reasoning: aiReaction.reasoning || 'AI analysis completed',
        confidence: Math.min(Math.max(aiReaction.confidence || 70, 0), 100)
      };

    } catch (error) {
      // Fallback to rule-based reaction
      return this.generateRuleBasedReaction(signal);
    }
  }

  private generateRuleBasedReaction(signal: MarketSignal): AIReaction {
    switch (signal.type) {
      case 'pump':
        return {
          action: signal.severity >= 8 ? 'buy' : 'scale_in',
          urgency: 'high',
          positionSize: 0.15,
          reasoning: 'High-confidence pump detected, entering position with controlled risk',
          confidence: 85
        };

      case 'rug':
        return {
          action: 'emergency_exit',
          urgency: 'critical',
          positionSize: 1.0,
          reasoning: 'Rug pull detected, immediate liquidation required',
          confidence: 95
        };

      case 'volume_spike':
        return {
          action: 'scale_in',
          urgency: 'medium',
          positionSize: 0.08,
          reasoning: 'Volume spike indicates potential breakout, small position entry',
          confidence: 75
        };

      default:
        return {
          action: 'hold',
          urgency: 'low',
          positionSize: 0,
          reasoning: 'Signal analysis inconclusive, maintaining current positions',
          confidence: 60
        };
    }
  }

  private async executeVolatilityReaction(signal: MarketSignal, reaction: AIReaction): Promise<void> {
    console.log(`🤖 AI VOLATILITY REACTION TRIGGERED`);
    console.log(`📊 Signal: ${signal.type} on ${signal.token} (Severity: ${signal.severity})`);
    console.log(`🎯 Reaction: ${reaction.action} with ${reaction.urgency} urgency`);
    console.log(`💭 AI Reasoning: ${reaction.reasoning}`);
    console.log(`🎲 Confidence: ${reaction.confidence}%`);

    // Record reaction
    this.reactionHistory.push({
      signal,
      reaction,
      timestamp: new Date()
    });

    // Emit event for trading system
    this.emit('volatility_reaction', {
      signal,
      reaction,
      shouldExecute: reaction.confidence >= 70 && reaction.urgency !== 'low'
    });

    // Special handling for critical situations
    if (reaction.urgency === 'critical') {
      this.activateEmergencyMode();
    }
  }

  private activateEmergencyMode(): void {
    if (this.emergencyMode) return;

    console.log('🚨 EMERGENCY MODE ACTIVATED');
    console.log('⚡ Ultra-fast reaction protocols enabled');
    console.log('🛡️ Capital protection prioritized');

    this.emergencyMode = true;

    // Auto-disable emergency mode after 5 minutes
    setTimeout(() => {
      this.emergencyMode = false;
      console.log('✅ Emergency mode deactivated');
    }, 300000);

    this.emit('emergency_mode_activated', {
      reason: 'Critical volatility signal detected',
      duration: 300000
    });
  }

  public getVolatilityInsights() {
    const recentReactions = this.reactionHistory.slice(-10);
    const emergencyCount = recentReactions.filter(r => r.reaction.urgency === 'critical').length;
    const avgConfidence = recentReactions.reduce((sum, r) => sum + r.reaction.confidence, 0) / recentReactions.length || 0;

    return {
      isActive: this.isActive,
      emergencyMode: this.emergencyMode,
      recentSignals: recentReactions.length,
      emergencyTriggers: emergencyCount,
      avgAIConfidence: Math.round(avgConfidence),
      lastReaction: recentReactions[recentReactions.length - 1],
      systemStatus: this.emergencyMode ? 'EMERGENCY' : 'MONITORING'
    };
  }

  public getReactionHistory(limit: number = 20) {
    return this.reactionHistory
      .slice(-limit)
      .reverse()
      .map(entry => ({
        timestamp: entry.timestamp,
        signal: {
          type: entry.signal.type,
          token: entry.signal.token,
          severity: entry.signal.severity
        },
        reaction: {
          action: entry.reaction.action,
          urgency: entry.reaction.urgency,
          confidence: entry.reaction.confidence
        }
      }));
  }

  public enable(): void {
    this.isActive = true;
    console.log('🤖 Ultra-Volatility AI System enabled');
  }

  public disable(): void {
    this.isActive = false;
    this.emergencyMode = false;
    console.log('⏸️ Ultra-Volatility AI System disabled');
  }
}

export const ultraVolatilityAI = new UltraVolatilityAISystem();