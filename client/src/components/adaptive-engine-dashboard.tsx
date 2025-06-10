import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock, Target, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface TradingDecision {
  action: 'buy' | 'sell' | 'hold' | 'defer' | 'reject';
  confidenceScore: number;
  positionSize: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeHorizon: 'scalp' | 'swing' | 'position';
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  signals: Array<{
    type: string;
    strength: number;
    confidence: number;
    timeframe: string;
    description: string;
  }>;
}

interface EngineStatus {
  isActive: boolean;
  confidenceThreshold: number;
  capitalAllocation: {
    totalCapital: number;
    availableCapital: number;
    reservedCapital: number;
    activePositions: number;
    maxPositionSize: number;
    riskBudget: number;
  };
  marketConditions: {
    trend: string;
    volatility: string;
    volume: string;
    sentiment: string;
    liquidityState: string;
  };
  performanceMetrics: {
    totalTrades: number;
    winningTrades: number;
    adaptationScore: number;
  };
  totalDecisions: number;
}

export function AdaptiveEngineDashboard() {
  const queryClient = useQueryClient();

  const { data: engineStatus, isLoading: statusLoading } = useQuery<EngineStatus>({
    queryKey: ['/api/adaptive-engine/status'],
    refetchInterval: 5000
  });

  const { data: recentDecisions, isLoading: decisionsLoading } = useQuery<TradingDecision[]>({
    queryKey: ['/api/adaptive-engine/decisions'],
    refetchInterval: 10000
  });

  const startEngineMutation = useMutation({
    mutationFn: () => fetch('/api/adaptive-engine/start', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-engine/status'] });
    }
  });

  const stopEngineMutation = useMutation({
    mutationFn: () => fetch('/api/adaptive-engine/stop', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-engine/status'] });
    }
  });

  const analyzeTokenMutation = useMutation({
    mutationFn: (tokenData: any) => fetch('/api/adaptive-engine/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenData)
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/adaptive-engine/decisions'] });
    }
  });

  const toggleEngine = () => {
    if (engineStatus?.isActive) {
      stopEngineMutation.mutate();
    } else {
      startEngineMutation.mutate();
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'sell':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      case 'defer':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'reject':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'sell':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'defer':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'reject':
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
      default:
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-500/20 text-green-500';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'high':
        return 'bg-orange-500/20 text-orange-500';
      case 'extreme':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  if (statusLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">Loading adaptive engine...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Engine Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Adaptive Trading Engine
            </div>
            <div className="flex items-center gap-3">
              <Badge className={engineStatus?.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}>
                {engineStatus?.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Switch
                checked={engineStatus?.isActive || false}
                onCheckedChange={toggleEngine}
                disabled={startEngineMutation.isPending || stopEngineMutation.isPending}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {engineStatus && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Capital Allocation</div>
                  <div className="text-2xl font-bold">${engineStatus.capitalAllocation.totalCapital}</div>
                  <div className="text-xs text-muted-foreground">
                    Available: ${engineStatus.capitalAllocation.availableCapital.toFixed(0)} | 
                    Reserved: ${engineStatus.capitalAllocation.reservedCapital.toFixed(0)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Performance</div>
                  <div className="text-2xl font-bold">
                    {engineStatus.performanceMetrics.totalTrades > 0 
                      ? `${((engineStatus.performanceMetrics.winningTrades / engineStatus.performanceMetrics.totalTrades) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {engineStatus.performanceMetrics.winningTrades}/{engineStatus.performanceMetrics.totalTrades} trades
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Confidence Threshold</div>
                  <div className="text-2xl font-bold">{engineStatus.confidenceThreshold}%</div>
                  <Progress value={engineStatus.confidenceThreshold} className="h-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Trend</div>
                  <div className="font-medium capitalize">{engineStatus.marketConditions.trend}</div>
                </div>
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Volatility</div>
                  <div className="font-medium capitalize">{engineStatus.marketConditions.volatility}</div>
                </div>
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Volume</div>
                  <div className="font-medium capitalize">{engineStatus.marketConditions.volume}</div>
                </div>
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Sentiment</div>
                  <div className="font-medium capitalize">{engineStatus.marketConditions.sentiment}</div>
                </div>
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Liquidity</div>
                  <div className="font-medium capitalize">{engineStatus.marketConditions.liquidityState}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Adaptation Score</span>
                </div>
                <div className="text-lg font-bold text-blue-500">
                  {engineStatus.performanceMetrics.adaptationScore}/100
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recent Trading Decisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {decisionsLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading decisions...</div>
          ) : recentDecisions && recentDecisions.length > 0 ? (
            <div className="space-y-3">
              {recentDecisions.slice(0, 10).map((decision, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getActionIcon(decision.action)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={getActionColor(decision.action)}>
                          {decision.action.toUpperCase()}
                        </Badge>
                        <Badge className={getRiskColor(decision.riskLevel)}>
                          {decision.riskLevel}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {decision.reasoning}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {decision.confidenceScore}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Size: {(decision.positionSize * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">No decisions yet</div>
          )}
        </CardContent>
      </Card>

      {/* Test Analysis Button */}
      <Card>
        <CardHeader>
          <CardTitle>Test Token Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              const testToken = {
                symbol: 'TEST',
                mintAddress: 'test123',
                price: 0.001,
                volume24h: 100000,
                volumeChange24h: 150,
                marketCap: 500000,
                liquidity: 100000,
                holders: 1500,
                priceChange1h: 5.2,
                priceChange24h: 12.8,
                priceChange7d: 45.6,
                volatilityScore: 65,
                liquidityScore: 75,
                momentumScore: 80,
                riskScore: 45,
                technicalScore: 70,
                socialScore: 85
              };
              analyzeTokenMutation.mutate(testToken);
            }}
            disabled={analyzeTokenMutation.isPending}
            className="w-full"
          >
            {analyzeTokenMutation.isPending ? 'Analyzing...' : 'Test Token Analysis'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}