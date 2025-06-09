import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, Activity, BarChart3, Clock, Zap } from "lucide-react";

interface SignalSubtype {
  id: string;
  name: string;
  category: 'sentiment_source' | 'sentiment_context' | 'time_segment' | 'technical_pattern' | 'volume_pattern';
  parentSignal: string;
  weight: number;
  metrics: {
    totalTrades: number;
    winRate: number;
    avgROI: number;
    avgHoldTime: number;
    maxDrawdown: number;
  };
  lastUpdated: Date;
}

interface SignalCombination {
  signals: string[];
  frequency: number;
  avgROI: number;
  winRate: number;
  confidence: 'high' | 'medium' | 'low';
  lastSeen: Date;
}

interface OptimizationReport {
  topPerformers: SignalSubtype[];
  worstPerformers: SignalSubtype[];
  bestCombinations: SignalCombination[];
  categoryPerformance: Map<string, number>;
  recommendations: string[];
}

export function SignalPerformanceHeatmap() {
  const { data: subtypes, isLoading: subtypesLoading } = useQuery<SignalSubtype[]>({
    queryKey: ["/api/signals/subtypes"],
    refetchInterval: 30000
  });

  const { data: combinations, isLoading: combinationsLoading } = useQuery<SignalCombination[]>({
    queryKey: ["/api/signals/combinations"],
    refetchInterval: 30000
  });

  const { data: report, isLoading: reportLoading } = useQuery<OptimizationReport>({
    queryKey: ["/api/signals/optimization-report"],
    refetchInterval: 60000
  });

  const optimizeSignals = async () => {
    try {
      const response = await fetch('/api/signals/optimize', { method: 'POST' });
      if (response.ok) {
        console.log('Signal optimization triggered');
      }
    } catch (error) {
      console.error('Failed to optimize signals:', error);
    }
  };

  if (subtypesLoading || combinationsLoading || reportLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Signal Performance Heatmap
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sentiment_source': return <Activity className="h-4 w-4" />;
      case 'sentiment_context': return <Zap className="h-4 w-4" />;
      case 'time_segment': return <Clock className="h-4 w-4" />;
      case 'volume_pattern': return <BarChart3 className="h-4 w-4" />;
      case 'technical_pattern': return <Target className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getPerformanceColor = (roi: number) => {
    if (roi > 10) return 'bg-green-500';
    if (roi > 5) return 'bg-green-400';
    if (roi > 0) return 'bg-yellow-400';
    if (roi > -5) return 'bg-orange-400';
    return 'bg-red-500';
  };

  const getPerformanceTextColor = (roi: number) => {
    if (roi > 5) return 'text-green-500';
    if (roi > 0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const groupedSignals = subtypes?.reduce((acc, signal) => {
    if (!acc[signal.category]) acc[signal.category] = [];
    acc[signal.category].push(signal);
    return acc;
  }, {} as Record<string, SignalSubtype[]>) || {};

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Signal Performance Heatmap
          </div>
          <Button 
            onClick={optimizeSignals}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Optimize Weights
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Performance Grid by Category */}
        <div className="space-y-4">
          {Object.entries(groupedSignals).map(([category, signals]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                {getCategoryIcon(category)}
                {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {signals.map((signal) => (
                  <div 
                    key={signal.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium truncate">
                        {signal.name}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getPerformanceTextColor(signal.metrics.avgROI)}`}
                      >
                        {signal.metrics.avgROI.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Weight:</span>
                        <span>{(signal.weight * 100).toFixed(0)}%</span>
                      </div>
                      <Progress 
                        value={signal.weight * 100} 
                        className="h-1"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Win Rate: {signal.metrics.winRate.toFixed(0)}%</span>
                        <span>Trades: {signal.metrics.totalTrades}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Top Performing Combinations */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Best Signal Combinations
          </h3>
          <div className="space-y-2">
            {combinations?.slice(0, 5).map((combo, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {combo.signals.map(s => s.replace(/_/g, ' ')).join(' + ')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Used {combo.frequency} times | {combo.winRate.toFixed(0)}% win rate
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-500">
                    +{combo.avgROI.toFixed(1)}%
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {combo.confidence}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Performance Leaders and Laggards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Performers */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-green-500 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Top Performers
            </h4>
            <div className="space-y-2">
              {report?.topPerformers.slice(0, 3).map((signal, index) => (
                <div key={signal.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(signal.category)}
                    <span className="text-sm font-medium">{signal.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-500">+{signal.metrics.avgROI.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">{signal.metrics.winRate.toFixed(0)}% win</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worst Performers */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-red-500 flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              Needs Improvement
            </h4>
            <div className="space-y-2">
              {report?.worstPerformers.slice(0, 3).map((signal, index) => (
                <div key={signal.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(signal.category)}
                    <span className="text-sm font-medium">{signal.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-500">{signal.metrics.avgROI.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">{signal.metrics.winRate.toFixed(0)}% win</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Optimization Recommendations */}
        {report?.recommendations && report.recommendations.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                AI Recommendations
              </h4>
              <div className="space-y-2">
                {report.recommendations.map((rec, index) => (
                  <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}