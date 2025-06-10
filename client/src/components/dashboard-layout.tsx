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

export function DashboardLayout() {
  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ['/api/prices/top-tokens'],
    queryFn: getTopTokens,
    refetchInterval: 30000,
  });

  const { data: recommendations, isLoading: recsLoading } = useQuery({
    queryKey: ['/api/recommendations'],
    queryFn: getRecommendations,
    refetchInterval: 60000,
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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <TradingModeIndicator />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-slate-800/50 border border-slate-700">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
            >
              Přehled
            </TabsTrigger>
            <TabsTrigger 
              value="trade-log" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
            >
              Alpha Trading
            </TabsTrigger>
            <TabsTrigger 
              value="alpha-heat" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
            >
              Alpha Heat
            </TabsTrigger>
            <TabsTrigger 
              value="system" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
            >
              Systém
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                <PortfolioGrowthChart />
                <DailyTradeSummary />
                <AlphaOpportunities />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <PositionsBreakdown />
                <AdaptiveModePanel />
                
                {/* Top Tokens */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Top Tokeny
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tokensLoading ? (
                      <div className="text-slate-400">Načítání...</div>
                    ) : (
                      <div className="space-y-3">
                        {tokens?.slice(0, 5).map((token: any) => (
                          <div key={token.symbol} className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{token.symbol}</div>
                              <div className="text-sm text-slate-400">{token.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatPrice(token.price)}</div>
                              <div className={`text-sm ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {formatChange(token.change24h)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Recommendations */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-blue-500" />
                      AI Doporučení
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recsLoading ? (
                      <div className="text-slate-400">Načítání...</div>
                    ) : (
                      <div className="space-y-3">
                        {recommendations?.slice(0, 3).map((rec: any, index: number) => (
                          <div 
                            key={index} 
                            className={`p-3 rounded-lg border ${getActionColor(rec.action)}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={getActionTextColor(rec.action)}>
                                  {getActionIcon(rec.action)}
                                </div>
                                <div>
                                  <div className="font-semibold">{rec.symbol}</div>
                                  <div className="text-sm text-slate-400">{rec.reason}</div>
                                </div>
                              </div>
                              <Badge variant="outline" className={getActionTextColor(rec.action)}>
                                {rec.confidence}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trade-log" className="space-y-6">
            <AlphaTradeLog />
          </TabsContent>

          <TabsContent value="alpha-heat" className="space-y-6">
            <AlphaHeatDashboard />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <SystemStatusPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}