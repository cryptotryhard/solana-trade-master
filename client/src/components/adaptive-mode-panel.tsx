import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Brain, Target, BarChart3, Activity } from "lucide-react";

interface AdaptiveMetrics {
  totalTrades: number;
  winRate: number;
  avgROI: number;
  bestPerformingSignals: SignalSource[];
  worstPerformingSignals: SignalSource[];
  strategyEvolution: StrategyWeights[];
  learningProgress: number;
}

interface SignalSource {
  name: string;
  type: 'ai' | 'sentiment' | 'technical' | 'volume' | 'momentum';
  weight: number;
  accuracy: number;
  avgROI: number;
  totalTrades: number;
  winRate: number;
  lastUpdated: Date;
}

interface StrategyWeights {
  aiWeight: number;
  sentimentWeight: number;
  volumeWeight: number;
  momentumWeight: number;
  technicalWeight: number;
  lastRebalanced: Date;
}

export function AdaptiveModePanel() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<AdaptiveMetrics>({
    queryKey: ["/api/adaptive/metrics"],
    refetchInterval: 10000
  });

  const { data: weights, isLoading: weightsLoading } = useQuery<StrategyWeights>({
    queryKey: ["/api/adaptive/weights"],
    refetchInterval: 10000
  });

  const { data: signals, isLoading: signalsLoading } = useQuery<SignalSource[]>({
    queryKey: ["/api/adaptive/signals"],
    refetchInterval: 10000
  });

  if (metricsLoading || weightsLoading || signalsLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Adaptive Strategy Engine
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

  const getSignalTypeIcon = (type: string) => {
    switch (type) {
      case 'ai': return <Brain className="h-4 w-4" />;
      case 'sentiment': return <Activity className="h-4 w-4" />;
      case 'volume': return <BarChart3 className="h-4 w-4" />;
      case 'momentum': return <TrendingUp className="h-4 w-4" />;
      case 'technical': return <Target className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getPerformanceColor = (value: number, isROI: boolean = false) => {
    if (isROI) {
      return value > 5 ? 'text-green-500' : value > 0 ? 'text-yellow-500' : 'text-red-500';
    }
    return value > 70 ? 'text-green-500' : value > 50 ? 'text-yellow-500' : 'text-red-500';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Adaptive Strategy Engine
          <Badge variant="outline" className="ml-auto">
            Learning Progress: {metrics?.learningProgress.toFixed(0)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Learning Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{metrics?.totalTrades || 0}</div>
            <div className="text-sm text-muted-foreground">Total Trades</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics?.winRate || 0)}`}>
              {metrics?.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics?.avgROI || 0, true)}`}>
              {metrics?.avgROI.toFixed(2)}%
            </div>
            <div className="text-sm text-muted-foreground">Avg ROI</div>
          </div>
        </div>

        <Progress value={metrics?.learningProgress || 0} className="w-full" />

        <Separator />

        {/* Current Strategy Weights */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Current Strategy Allocation</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Analysis
              </span>
              <div className="flex items-center gap-2">
                <Progress value={(weights?.aiWeight || 0) * 100} className="w-20" />
                <span className="text-sm font-medium w-12">{((weights?.aiWeight || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Sentiment
              </span>
              <div className="flex items-center gap-2">
                <Progress value={(weights?.sentimentWeight || 0) * 100} className="w-20" />
                <span className="text-sm font-medium w-12">{((weights?.sentimentWeight || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Volume
              </span>
              <div className="flex items-center gap-2">
                <Progress value={(weights?.volumeWeight || 0) * 100} className="w-20" />
                <span className="text-sm font-medium w-12">{((weights?.volumeWeight || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Momentum
              </span>
              <div className="flex items-center gap-2">
                <Progress value={(weights?.momentumWeight || 0) * 100} className="w-20" />
                <span className="text-sm font-medium w-12">{((weights?.momentumWeight || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Technical
              </span>
              <div className="flex items-center gap-2">
                <Progress value={(weights?.technicalWeight || 0) * 100} className="w-20" />
                <span className="text-sm font-medium w-12">{((weights?.technicalWeight || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Signal Performance */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Signal Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Best Performing */}
            <div>
              <h4 className="text-sm font-medium text-green-500 mb-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Top Performers
              </h4>
              <div className="space-y-2">
                {metrics?.bestPerformingSignals.slice(0, 3).map((signal, index) => (
                  <div key={signal.name} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <div className="flex items-center gap-2">
                      {getSignalTypeIcon(signal.type)}
                      <span className="text-sm font-medium">{signal.name.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-500">+{signal.avgROI.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">{signal.winRate.toFixed(0)}% win</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Worst Performing */}
            <div>
              <h4 className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                Needs Improvement
              </h4>
              <div className="space-y-2">
                {metrics?.worstPerformingSignals.slice(0, 3).map((signal, index) => (
                  <div key={signal.name} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <div className="flex items-center gap-2">
                      {getSignalTypeIcon(signal.type)}
                      <span className="text-sm font-medium">{signal.name.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-500">{signal.avgROI.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">{signal.winRate.toFixed(0)}% win</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Evolution Status */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-500">Strategy Evolution</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Victoria continuously learns from trade outcomes and adjusts strategy weights every 24 hours.
            Current learning progress: {metrics?.learningProgress.toFixed(0)}% of minimum trades needed for rebalancing.
          </p>
          {weights?.lastRebalanced && (
            <p className="text-xs text-muted-foreground mt-1">
              Last rebalanced: {new Date(weights.lastRebalanced).toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}