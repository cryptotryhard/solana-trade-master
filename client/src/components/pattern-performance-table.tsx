import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  DollarSign,
  Settings,
  Zap
} from "lucide-react";

interface PatternMetrics {
  patternType: string;
  totalTrades: number;
  winRate: number;
  avgROI: number;
  avgHoldDuration: number;
  avgSlippage: number;
  maxROI: number;
  minROI: number;
  bestStrategy: {
    entryMethod: string;
    exitStrategy: string;
    avgROI: number;
  };
  lastUpdated: string;
}

interface StrategyAdjustment {
  patternType: string;
  recommendedEntryMethod: string;
  recommendedExitStrategy: string;
  confidenceMultiplier: number;
  reasoning: string;
  expectedROI: number;
  riskLevel: string;
}

export function PatternPerformanceTable() {
  const [adaptationEnabled, setAdaptationEnabled] = useState(true);
  const [showAdjustments, setShowAdjustments] = useState(false);

  const { data: patternMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/pattern-performance/metrics'],
    refetchInterval: 30000,
  });

  const { data: strategyAdjustments, isLoading: adjustmentsLoading } = useQuery({
    queryKey: ['/api/pattern-performance/adjustments'],
    refetchInterval: 60000,
    enabled: showAdjustments,
  });

  const { data: topPerformers } = useQuery({
    queryKey: ['/api/pattern-performance/top-performers'],
    refetchInterval: 30000,
  });

  const toggleAdaptation = async () => {
    try {
      const response = await fetch('/api/pattern-performance/toggle-adaptation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !adaptationEnabled })
      });
      
      if (response.ok) {
        setAdaptationEnabled(!adaptationEnabled);
      }
    } catch (error) {
      console.error('Failed to toggle pattern adaptation:', error);
    }
  };

  const getPatternIcon = (pattern: string) => {
    switch (pattern) {
      case 'instant_spike': return '🚀';
      case 'delayed_pump': return '⏳';
      case 'slow_curve': return '📈';
      case 'multiple_waves': return '🌊';
      case 'fakeout_dump': return '⚠️';
      case 'no_pump': return '📊';
      default: return '📊';
    }
  };

  const getPatternName = (pattern: string) => {
    switch (pattern) {
      case 'instant_spike': return 'Instant Spike';
      case 'delayed_pump': return 'Delayed Pump';
      case 'slow_curve': return 'Slow Curve';
      case 'multiple_waves': return 'Multiple Waves';
      case 'fakeout_dump': return 'Fakeout Dump';
      case 'no_pump': return 'No Pump';
      default: return pattern;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'extreme': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getROIColor = (roi: number) => {
    if (roi > 20) return 'text-green-600 font-bold';
    if (roi > 0) return 'text-green-600';
    if (roi > -10) return 'text-orange-600';
    return 'text-red-600';
  };

  if (metricsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pattern Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Performers Summary */}
      {topPerformers && topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Performing Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPerformers.slice(0, 3).map((pattern: PatternMetrics) => (
                <div key={pattern.patternType} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getPatternIcon(pattern.patternType)}</span>
                    <span className="font-semibold text-sm">{getPatternName(pattern.patternType)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Win Rate:</span>
                      <span className="font-semibold text-green-600">{pattern.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg ROI:</span>
                      <span className={getROIColor(pattern.avgROI)}>
                        {pattern.avgROI > 0 ? '+' : ''}{pattern.avgROI.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Trades:</span>
                      <span className="text-muted-foreground">{pattern.totalTrades}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Pattern Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pattern Performance Analytics
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="pattern-adaptation"
                  checked={adaptationEnabled}
                  onCheckedChange={toggleAdaptation}
                />
                <label htmlFor="pattern-adaptation" className="text-sm font-medium">
                  Pattern-Based Strategy Adaptation
                </label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdjustments(!showAdjustments)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showAdjustments ? 'Hide' : 'Show'} Adjustments
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {patternMetrics && patternMetrics.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pattern Type</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Avg ROI</TableHead>
                  <TableHead>Max ROI</TableHead>
                  <TableHead>Avg Duration</TableHead>
                  <TableHead>Slippage</TableHead>
                  <TableHead>Best Strategy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patternMetrics.map((pattern: PatternMetrics) => (
                  <TableRow key={pattern.patternType}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getPatternIcon(pattern.patternType)}</span>
                        <span className="font-medium">{getPatternName(pattern.patternType)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pattern.totalTrades}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={pattern.winRate} className="w-16 h-2" />
                        <span className="text-sm font-medium">{pattern.winRate.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={getROIColor(pattern.avgROI)}>
                        {pattern.avgROI > 0 ? '+' : ''}{pattern.avgROI.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-green-600 font-medium">
                        +{pattern.maxROI.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-sm">{pattern.avgHoldDuration.toFixed(0)}m</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{pattern.avgSlippage.toFixed(2)}%</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="font-medium">{pattern.bestStrategy.entryMethod}</div>
                        <div className="text-muted-foreground">{pattern.bestStrategy.exitStrategy}</div>
                        <div className="text-green-600">+{pattern.bestStrategy.avgROI.toFixed(1)}%</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pattern Data Yet</h3>
              <p className="text-muted-foreground">
                Pattern performance metrics will appear as trades are completed and analyzed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategy Adjustments */}
      {showAdjustments && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Pattern-Based Strategy Adjustments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adjustmentsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : strategyAdjustments && strategyAdjustments.length > 0 ? (
              <div className="space-y-4">
                {strategyAdjustments.map((adjustment: StrategyAdjustment) => (
                  <div key={adjustment.patternType} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getPatternIcon(adjustment.patternType)}</span>
                        <span className="font-semibold">{getPatternName(adjustment.patternType)}</span>
                        <Badge className={getRiskColor(adjustment.riskLevel)}>
                          {adjustment.riskLevel}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Expected ROI</div>
                        <div className={`font-bold ${getROIColor(adjustment.expectedROI)}`}>
                          {adjustment.expectedROI > 0 ? '+' : ''}{adjustment.expectedROI.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-sm font-medium mb-1">Recommended Entry</div>
                        <Badge variant="outline">{adjustment.recommendedEntryMethod}</Badge>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">Recommended Exit</div>
                        <Badge variant="outline">{adjustment.recommendedExitStrategy}</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Confidence: {(adjustment.confidenceMultiplier * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {adjustment.reasoning}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Strategy Adjustments</h3>
                <p className="text-muted-foreground">
                  Strategy adjustments will be generated as pattern performance data accumulates.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}