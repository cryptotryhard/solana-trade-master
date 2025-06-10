import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Zap, 
  AlertTriangle, 
  Target,
  BarChart3,
  Activity,
  Bell,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

interface SignalPerformance {
  signalId: string;
  name: string;
  type: 'ai' | 'sentiment' | 'technical' | 'volume' | 'momentum';
  totalTrades: number;
  winRate: number;
  avgROI: number;
  totalROI: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgHoldTime: number;
  lastUsed: Date;
  performance7d: number;
  performance24h: number;
  confidence: number;
}

interface StrategyLeaderboard {
  strategyId: string;
  name: string;
  rank: number;
  score: number;
  trades24h: number;
  roi24h: number;
  winRate24h: number;
  totalPnL: number;
  riskAdjustedReturn: number;
  consistency: number;
  adaptability: number;
}

interface DrawdownHeatmap {
  timeSlot: string;
  drawdownPercent: number;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  causes: string[];
  recoveryTime: number;
}

interface PortfolioProtection {
  currentDrawdown: number;
  maxDrawdown24h: number;
  riskLevel: 'safe' | 'moderate' | 'aggressive' | 'critical';
  protectionTriggered: boolean;
  conservativeModeActive: boolean;
  lastProtectionTrigger?: Date;
  protectionHistory: Array<{
    timestamp: Date;
    reason: string;
    drawdown: number;
    actionTaken: string;
  }>;
}

interface Alert {
  id: string;
  type: 'roi' | 'milestone' | 'api_failure' | 'system_error' | 'portfolio_protection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  sent: boolean;
  channels: string[];
}

export function AdvancedMetricsDashboard() {
  const [activeTab, setActiveTab] = useState('signals');

  const { data: signalPerformance } = useQuery({
    queryKey: ['/api/metrics/signals/performance'],
    refetchInterval: 30000,
  });

  const { data: strategyLeaderboard } = useQuery({
    queryKey: ['/api/metrics/strategy/leaderboard'],
    refetchInterval: 30000,
  });

  const { data: drawdownHeatmap } = useQuery({
    queryKey: ['/api/metrics/drawdown/heatmap'],
    refetchInterval: 60000,
  });

  const { data: portfolioProtection } = useQuery({
    queryKey: ['/api/metrics/portfolio/protection'],
    refetchInterval: 15000,
  });

  const { data: recentAlerts } = useQuery({
    queryKey: ['/api/alerts/recent'],
    refetchInterval: 10000,
  });

  const { data: alertStats } = useQuery({
    queryKey: ['/api/alerts/stats'],
    refetchInterval: 60000,
  });

  const testAlert = async () => {
    try {
      await fetch('/api/alerts/test', { method: 'POST' });
    } catch (error) {
      console.error('Failed to send test alert:', error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(2);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-950';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-950';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-950';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Advanced Metrics</h2>
          <p className="text-muted-foreground">Real-time performance analytics and portfolio protection</p>
        </div>
        <Button onClick={testAlert} variant="outline" size="sm">
          <Bell className="h-4 w-4 mr-2" />
          Test Alert
        </Button>
      </div>

      {/* Portfolio Protection Status */}
      {portfolioProtection && (
        <Card className={`border-2 ${
          portfolioProtection.protectionTriggered 
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' 
            : 'border-green-500 bg-green-50 dark:bg-green-950'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className={`h-5 w-5 ${
                  portfolioProtection.protectionTriggered ? 'text-orange-600' : 'text-green-600'
                }`} />
                <CardTitle className="text-lg">Portfolio Protection</CardTitle>
              </div>
              <Badge variant={portfolioProtection.protectionTriggered ? 'destructive' : 'secondary'}>
                {portfolioProtection.riskLevel.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Drawdown</p>
                <p className={`text-2xl font-bold ${
                  portfolioProtection.currentDrawdown > 10 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {portfolioProtection.currentDrawdown.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Max 24h Drawdown</p>
                <p className="text-2xl font-bold">
                  {portfolioProtection.maxDrawdown24h.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conservative Mode</p>
                <div className="flex items-center space-x-2">
                  {portfolioProtection.conservativeModeActive ? (
                    <CheckCircle2 className="h-5 w-5 text-orange-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className={portfolioProtection.conservativeModeActive ? 'text-orange-600' : 'text-gray-600'}>
                    {portfolioProtection.conservativeModeActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="signals">Signal Performance</TabsTrigger>
          <TabsTrigger value="strategies">Strategy Leaderboard</TabsTrigger>
          <TabsTrigger value="drawdown">Drawdown Heatmap</TabsTrigger>
          <TabsTrigger value="alerts">Alert System</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-4">
          <div className="grid gap-4">
            {signalPerformance?.map((signal: SignalPerformance) => (
              <Card key={signal.signalId}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{signal.name}</h3>
                      <Badge variant="outline" className="capitalize">
                        {signal.type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {signal.avgROI.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg ROI</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-lg font-semibold">{signal.winRate.toFixed(1)}%</p>
                      <Progress value={signal.winRate} className="mt-1" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Trades</p>
                      <p className="text-lg font-semibold">{signal.totalTrades}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-lg font-semibold">{signal.sharpeRatio.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-lg font-semibold">{signal.confidence.toFixed(1)}%</p>
                      <Progress value={signal.confidence} className="mt-1" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span>24h: {signal.performance24h.toFixed(1)}%</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        <span>7d: {signal.performance7d.toFixed(1)}%</span>
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Last used: {new Date(signal.lastUsed).toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <div className="grid gap-4">
            {strategyLeaderboard?.map((strategy: StrategyLeaderboard) => (
              <Card key={strategy.strategyId}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        strategy.rank === 1 ? 'bg-yellow-500' :
                        strategy.rank === 2 ? 'bg-gray-400' :
                        strategy.rank === 3 ? 'bg-amber-600' : 'bg-blue-500'
                      }`}>
                        {strategy.rank}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{strategy.name}</h3>
                        <p className="text-sm text-muted-foreground">Score: {strategy.score.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        strategy.roi24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {strategy.roi24h >= 0 ? '+' : ''}{strategy.roi24h.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">24h ROI</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Trades 24h</p>
                      <p className="text-lg font-semibold">{strategy.trades24h}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Win Rate 24h</p>
                      <p className="text-lg font-semibold">{strategy.winRate24h.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Consistency</p>
                      <p className="text-lg font-semibold">{strategy.consistency.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Adaptability</p>
                      <p className="text-lg font-semibold">{strategy.adaptability.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="drawdown" className="space-y-4">
          <div className="grid gap-4">
            {drawdownHeatmap?.map((slot: DrawdownHeatmap, index: number) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{slot.timeSlot}</h3>
                      <Badge className={getSeverityColor(slot.severity)}>
                        {slot.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-600">
                        -{slot.drawdownPercent.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Max Drawdown</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Frequency</p>
                      <p className="text-lg font-semibold">{slot.frequency}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recovery Time</p>
                      <p className="text-lg font-semibold">{slot.recoveryTime}min</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Common Causes</p>
                    <div className="flex flex-wrap gap-2">
                      {slot.causes.map((cause, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {cause}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alertStats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{alertStats.totalAlerts}</p>
                      <p className="text-sm text-muted-foreground">Total Alerts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold">{alertStats.alertsBySeverity?.critical || 0}</p>
                      <p className="text-sm text-muted-foreground">Critical Alerts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{alertStats.alertsByType?.roi || 0}</p>
                      <p className="text-sm text-muted-foreground">ROI Alerts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="space-y-4">
            {recentAlerts?.map((alert: Alert) => (
              <Card key={alert.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.type === 'roi' && <TrendingUp className="h-4 w-4" />}
                        {alert.type === 'milestone' && <Target className="h-4 w-4" />}
                        {alert.type === 'api_failure' && <AlertTriangle className="h-4 w-4" />}
                        {alert.type === 'portfolio_protection' && <Shield className="h-4 w-4" />}
                        {alert.type === 'system_error' && <XCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <h3 className="font-semibold">{alert.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.message.length > 200 ? 
                            `${alert.message.substring(0, 200)}...` : 
                            alert.message
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex space-x-1 mt-1">
                        {alert.channels.map((channel, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}