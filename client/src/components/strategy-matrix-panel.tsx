import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Zap, 
  BarChart3, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Timer,
  ShoppingCart,
  DollarSign
} from "lucide-react";

interface TradingStrategy {
  entryMethod: 'market_buy' | 'limit_buy' | 'delayed_entry' | 'dca_entry';
  exitMethod: 'trailing_stop' | 'roi_target' | 'volatility_based' | 'time_exit' | 'momentum_reversal';
  entryParams: {
    delaySeconds?: number;
    limitOffset?: number;
    dcaSteps?: number;
    slippageTolerance?: number;
  };
  exitParams: {
    trailingStopPercent?: number;
    roiTarget?: number;
    maxHoldTime?: number;
    volatilityThreshold?: number;
    stopLossPercent?: number;
  };
}

interface SignalCluster {
  id: string;
  signals: string[];
  frequency: number;
  avgROI: number;
  winRate: number;
  confidence: 'high' | 'medium' | 'low';
  preferredStrategy: TradingStrategy;
  lastUpdated: Date;
}

interface StrategyPerformance {
  signalClusterId: string;
  strategy: TradingStrategy;
  metrics: {
    totalTrades: number;
    avgROI: number;
    winRate: number;
    avgHoldTime: number;
    maxDrawdown: number;
    slippageImpact: number;
    breakoutCaptureRate: number;
  };
  lastUsed: Date;
}

interface StrategyMatrix {
  clusters: SignalCluster[];
  performances: StrategyPerformance[];
  topPerformingStrategies: Array<{
    clusterId: string;
    strategy: string;
    avgROI: number;
    winRate: number;
    trades: number;
  }>;
}

export function StrategyMatrixPanel() {
  const { data: strategyMatrix, isLoading } = useQuery<StrategyMatrix>({
    queryKey: ["/api/strategies/matrix"],
    refetchInterval: 30000
  });

  const optimizeStrategies = async () => {
    try {
      const response = await fetch('/api/strategies/optimize', { method: 'POST' });
      if (response.ok) {
        console.log('Strategy optimization triggered');
      }
    } catch (error) {
      console.error('Failed to optimize strategies:', error);
    }
  };

  const getEntryIcon = (method: string) => {
    switch (method) {
      case 'market_buy': return <ShoppingCart className="h-4 w-4" />;
      case 'limit_buy': return <Target className="h-4 w-4" />;
      case 'delayed_entry': return <Timer className="h-4 w-4" />;
      case 'dca_entry': return <BarChart3 className="h-4 w-4" />;
      default: return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const getExitIcon = (method: string) => {
    switch (method) {
      case 'trailing_stop': return <TrendingDown className="h-4 w-4" />;
      case 'roi_target': return <DollarSign className="h-4 w-4" />;
      case 'volatility_based': return <Zap className="h-4 w-4" />;
      case 'time_exit': return <Clock className="h-4 w-4" />;
      case 'momentum_reversal': return <TrendingUp className="h-4 w-4" />;
      default: return <TrendingDown className="h-4 w-4" />;
    }
  };

  const getPerformanceColor = (roi: number) => {
    if (roi > 15) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (roi > 5) return 'text-green-500 bg-green-50 dark:bg-green-900/20';
    if (roi > 0) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-500 bg-red-50 dark:bg-red-900/20';
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatMethodName = (method: string) => {
    return method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Strategy Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Strategy Matrix
          </div>
          <Button 
            onClick={optimizeStrategies}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Optimize All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Top Performing Strategies */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Top Performing Strategies
            </h3>
            <div className="space-y-2">
              {strategyMatrix?.topPerformingStrategies.map((strategy, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">
                      {strategy.clusterId.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {strategy.strategy}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600 text-sm">
                      +{strategy.avgROI.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {strategy.winRate.toFixed(0)}% win • {strategy.trades} trades
                    </div>
                  </div>
                  <Badge variant="outline" className="ml-3 text-xs">
                    #{index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Signal Clusters */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" />
              Signal Clusters & Strategies
            </h3>
            <div className="grid gap-3">
              {strategyMatrix?.clusters.map((cluster) => (
                <div 
                  key={cluster.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">
                        {cluster.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {cluster.signals.map((signal, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {signal.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${getPerformanceColor(cluster.avgROI).split(' ')[0]}`}>
                        {cluster.avgROI > 0 ? '+' : ''}{cluster.avgROI.toFixed(1)}%
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getConfidenceColor(cluster.confidence)} mt-1 ml-auto`}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Entry Strategy */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ArrowUpCircle className="h-4 w-4 text-blue-500" />
                        Entry Strategy
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        {getEntryIcon(cluster.preferredStrategy.entryMethod)}
                        <span className="text-sm">{formatMethodName(cluster.preferredStrategy.entryMethod)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {cluster.preferredStrategy.entryParams.slippageTolerance && 
                          `Slippage: ${cluster.preferredStrategy.entryParams.slippageTolerance}%`}
                        {cluster.preferredStrategy.entryParams.delaySeconds && 
                          `Delay: ${cluster.preferredStrategy.entryParams.delaySeconds}s`}
                        {cluster.preferredStrategy.entryParams.limitOffset && 
                          `Offset: ${cluster.preferredStrategy.entryParams.limitOffset}%`}
                      </div>
                    </div>

                    {/* Exit Strategy */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                        Exit Strategy
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        {getExitIcon(cluster.preferredStrategy.exitMethod)}
                        <span className="text-sm">{formatMethodName(cluster.preferredStrategy.exitMethod)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {cluster.preferredStrategy.exitParams.roiTarget && 
                          `Target: ${cluster.preferredStrategy.exitParams.roiTarget}%`}
                        {cluster.preferredStrategy.exitParams.trailingStopPercent && 
                          `Trail: ${cluster.preferredStrategy.exitParams.trailingStopPercent}%`}
                        {cluster.preferredStrategy.exitParams.maxHoldTime && 
                          `Max: ${cluster.preferredStrategy.exitParams.maxHoldTime}m`}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <div className="text-xs text-muted-foreground">
                      {cluster.frequency} trades | {cluster.winRate.toFixed(0)}% win rate
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {cluster.confidence}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}