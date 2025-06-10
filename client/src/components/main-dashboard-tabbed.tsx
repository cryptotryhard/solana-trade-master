import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { AdaptiveEngineDashboard } from './adaptive-engine-dashboard';
import { LearningDashboard } from './learning-dashboard';
import { CopyTradingDashboard } from './copytrading-dashboard';
import { AlphaHeatDashboard } from './alpha-heat-dashboard';
import { SystemStatusPanel } from './system-status-panel';
import { PortfolioGrowthChart } from './portfolio-growth-chart';
import { AlphaTradeLog } from './alpha-trade-log';
import { TradingModeIndicator } from './trading-mode-indicator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        return <ArrowUp className="w-4 h-4" />;
      case 'sell':
        return <ArrowDown className="w-4 h-4" />;
      case 'hold':
        return <Pause className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
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
    <div className="dashboard-main">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Portfolio Overview</TabsTrigger>
          <TabsTrigger value="trade-log">Alpha Trade Log</TabsTrigger>
          <TabsTrigger value="alpha-heat">Alpha Heat</TabsTrigger>
          <TabsTrigger value="system">System Status</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{token.symbol.slice(0, 3)}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{token.symbol}</div>
                            <div className="text-xs text-muted-foreground truncate">{token.name}</div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-mono">{formatPrice(token.price)}</div>
                          <div className={`text-xs ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatChange(token.change24h)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Vol: ${((token.volume24h || 0) / 1000000).toFixed(1)}M | MCap: ${((token.marketCap || 0) / 1000000).toFixed(1)}M
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Portfolio Growth Chart */}
              <PortfolioGrowthChart />
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card className="glass-effect neon-border">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Brain className="mr-2 h-5 w-5 text-accent" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-accent/20 animate-pulse">
                      <div className="h-4 bg-secondary rounded w-1/4"></div>
                      <div className="h-4 bg-secondary rounded w-1/6"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations?.slice(0, 5).map((rec: any) => (
                    <div key={rec.symbol} className={`flex items-center justify-between p-3 rounded-lg border ${getActionColor(rec.action)}`}>
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${getActionColor(rec.action)}`}>
                          <div className={getActionTextColor(rec.action)}>
                            {getActionIcon(rec.action)}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{rec.symbol}</div>
                          <div className="text-xs text-muted-foreground">{rec.action.toUpperCase()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{rec.confidence}% Confidence</div>
                        <div className="text-xs text-muted-foreground">{rec.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Dashboard Components */}
          <div className="section-divider"></div>
          
          <div className="grid-responsive grid-2">
            <div className="component-container">
              <PositionsBreakdown />
            </div>
            <div className="component-container">
              <DailyTradeSummary />
            </div>
          </div>

          <div className="section-divider"></div>

          <div className="grid-responsive grid-3">
            <div className="component-container">
              <AdaptiveModePanel />
            </div>
            <div className="component-container">
              <SignalPerformanceHeatmap />
            </div>
            <div className="component-container">
              <StrategyMatrixPanel />
            </div>
          </div>

          <div className="section-divider"></div>

          <div className="component-container">
            <AlphaOpportunities />
          </div>
          
          <div className="component-container">
            <PatternPerformanceTable />
          </div>
        </TabsContent>

        <TabsContent value="trade-log" className="space-y-6">
          <AlphaTradeLog />
        </TabsContent>

        <TabsContent value="alpha-heat" className="space-y-6">
          <AlphaHeatDashboard />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TradingModeIndicator />
            <SystemStatusPanel />
            <PortfolioMetaDashboard />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CrashShieldDashboard />
            <AccountIntelligenceDashboard />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdaptiveEngineDashboard />
            <LearningDashboard />
          </div>

          <CopyTradingDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}