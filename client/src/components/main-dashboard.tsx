import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Brain, Circle, ArrowUp, ArrowDown, Pause } from 'lucide-react';
import { getTopTokens, getRecommendations } from '@/lib/crypto-api';
import { PositionsBreakdown } from './positions-breakdown';
import { DailyTradeSummary } from './daily-trade-summary';
import { AdaptiveModePanel } from './adaptive-mode-panel';
import { SignalPerformanceHeatmap } from './signal-performance-heatmap';
import { StrategyMatrixPanel } from './strategy-matrix-panel';
import { AlphaOpportunities } from './alpha-opportunities';
import { PatternPerformanceTable } from './pattern-performance-table';
import { PortfolioMetaDashboard } from './portfolio-meta-dashboard';
import { CrashShieldDashboard } from './crash-shield-dashboard';
import { AccountIntelligenceDashboard } from './account-intelligence-dashboard';

export function MainDashboard() {
  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ['/api/prices/top-tokens'],
    queryFn: getTopTokens,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: recommendations, isLoading: recsLoading } = useQuery({
    queryKey: ['/api/recommendations'],
    queryFn: getRecommendations,
    refetchInterval: 60000, // Refetch every minute
  });

  const formatPrice = (price: number) => {
    if (price < 0.01) {
      return `$${price.toFixed(8)}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy':
        return <ArrowUp className="text-green-500" />;
      case 'sell':
        return <ArrowDown className="text-red-500" />;
      case 'hold':
        return <Pause className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy':
        return 'bg-green-500/10 border-green-500/30';
      case 'sell':
        return 'bg-red-500/10 border-red-500/30';
      case 'hold':
        return 'bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'bg-secondary/50';
    }
  };

  const getActionTextColor = (action: string) => {
    switch (action) {
      case 'buy':
        return 'text-green-500';
      case 'sell':
        return 'text-red-500';
      case 'hold':
        return 'text-yellow-500';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <Card className="glass-effect neon-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="mr-2 h-5 w-5 text-accent" />
              Market Overview
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Last updated: <span className="font-mono">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tokensLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-secondary/50 rounded-lg p-4 border border-accent/20 animate-pulse">
                  <div className="h-20 bg-secondary rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {tokens?.slice(0, 3).map((token) => (
                <div key={token.symbol} className="bg-secondary/50 rounded-lg p-4 border border-accent/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{token.symbol.slice(0, 3)}</span>
                      </div>
                      <span className="font-semibold">{token.symbol}</span>
                    </div>
                    <span className={`text-sm ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatChange(token.change24h)}
                    </span>
                  </div>
                  <div className="text-xl font-mono font-bold">{formatPrice(token.price)}</div>
                </div>
              ))}
            </div>
          )}
          
          {/* Chart Placeholder */}
          <div className="bg-secondary/30 rounded-lg h-64 flex items-center justify-center border border-accent/20">
            <div className="text-center">
              <TrendingUp className="mx-auto h-16 w-16 text-accent mb-4 animate-pulse" />
              <p className="text-muted-foreground">Live Trading Chart</p>
              <p className="text-xs text-muted-foreground/60">Powered by TradingView API</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card className="glass-effect neon-border">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Brain className="mr-2 h-5 w-5 text-green-500" />
            AI Recommendations
            <div className="ml-auto flex items-center space-x-2">
              <Circle className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Live Analysis</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-secondary/50 rounded-lg p-4 animate-pulse">
                  <div className="h-16 bg-secondary rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations?.slice(0, 3).map((rec) => (
                <div key={rec.id} className={`border rounded-lg p-4 animate-slide-up ${getActionColor(rec.action)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(rec.action)}
                      <span className={`font-semibold ${getActionTextColor(rec.action)}`}>
                        {rec.action.toUpperCase()} SIGNAL
                      </span>
                      <span className="text-sm text-muted-foreground">{rec.symbol}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getActionColor(rec.action)} ${getActionTextColor(rec.action)}`}>
                      {rec.confidence}% Confidence
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Trade Summary */}
      <DailyTradeSummary />

      {/* Active Positions */}
      <PositionsBreakdown />

      {/* Adaptive Strategy Engine */}
      <AdaptiveModePanel />

      {/* Signal Performance Heatmap */}
      <SignalPerformanceHeatmap />

      {/* Strategy Matrix Panel */}
      <StrategyMatrixPanel />

      {/* Alpha Opportunities with Pre-Pump Prediction */}
      <AlphaOpportunities />

      {/* Pattern Performance Analytics */}
      <PatternPerformanceTable />

      {/* Portfolio Meta-Manager */}
      <PortfolioMetaDashboard />

      {/* Crash Shield Auto-Protect */}
      <CrashShieldDashboard />

      {/* Account Intelligence & Audit */}
      <AccountIntelligenceDashboard />
    </div>
  );
}
