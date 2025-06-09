import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  Activity,
  AlertTriangle,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Star,
  Trophy,
  Zap
} from "lucide-react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface PerformanceMetrics {
  netProfit: number;
  portfolioValue: number;
  totalTrades: number;
  winRate: number;
  avgROI: number;
  maxDrawdown: number;
  currentDrawdown: number;
  sharpeRatio: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
}

interface PeriodData {
  date: string;
  netProfit: number;
  portfolioValue: number;
  trades: number;
  winRate: number;
  drawdown: number;
  strategyMode: string;
}

interface TokenPerformance {
  symbol: string;
  totalTrades: number;
  winRate: number;
  totalROI: number;
  avgROI: number;
  bestTrade: number;
  worstTrade: number;
  totalVolume: number;
  lastTraded: string;
  isLocked: boolean;
}

interface RiskEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metrics: {
    portfolioValue?: number;
    drawdown?: number;
    consecutiveLosses?: number;
  };
  impact: {
    tradingRestricted: boolean;
    positionSizeReduced: boolean;
    tokensLocked: string[];
  };
  resolution?: {
    timestamp: string;
    method: string;
    description: string;
  };
}

interface TradeJournalEntry {
  id: string;
  timestamp: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  value: number;
  pnl?: number;
  roi?: number;
  confidence: number;
  signals: string[];
  strategyUsed: string;
  tags: string[];
  outcome: 'win' | 'loss' | 'breakeven' | 'open';
  portfolioImpact: {
    beforeValue: number;
    afterValue: number;
    percentageChange: number;
  };
}

interface StrategyTransition {
  timestamp: string;
  fromMode: string;
  toMode: string;
  reason: string;
  metrics: {
    winRate: number;
    drawdown: number;
    confidence: number;
  };
  duration: number;
}

export function AccountIntelligenceDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('7d');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');

  const { data: performanceMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: [`/api/account/performance/${selectedPeriod}`],
    refetchInterval: 30000,
  });

  const { data: performanceHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['/api/account/performance-history', { days: 30 }],
    refetchInterval: 60000,
  });

  const { data: tokenLeaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ['/api/account/token-leaderboard'],
    refetchInterval: 120000,
  });

  const { data: riskEvents = [], isLoading: riskLoading } = useQuery({
    queryKey: ['/api/account/risk-events'],
    refetchInterval: 30000,
  });

  const { data: tradeJournal = [], isLoading: journalLoading } = useQuery({
    queryKey: ['/api/account/trade-journal'],
    refetchInterval: 20000,
  });

  const { data: strategyTransitions = [], isLoading: transitionsLoading } = useQuery({
    queryKey: ['/api/account/strategy-transitions'],
    refetchInterval: 60000,
  });

  const exportTradeJournal = async () => {
    try {
      const response = await fetch(`/api/account/export-journal?format=${exportFormat}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `victoria_trade_journal_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export trade journal:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'win': return 'text-green-600 dark:text-green-400';
      case 'loss': return 'text-red-600 dark:text-red-400';
      case 'breakeven': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    }
  };

  const getStrategyModeColor = (mode: string) => {
    switch (mode) {
      case 'hyper': return '#ef4444';
      case 'scaled': return '#f59e0b';
      case 'conservative': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (metricsLoading || historyLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Account Intelligence & Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading performance data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = performanceMetrics as PerformanceMetrics;
  const history = performanceHistory as PeriodData[];
  const tokens = tokenLeaderboard as TokenPerformance[];
  const events = riskEvents as RiskEvent[];
  const journal = tradeJournal as TradeJournalEntry[];
  const transitions = strategyTransitions as StrategyTransition[];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Account Intelligence & Audit System
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant={selectedPeriod === '24h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod('24h')}
                >
                  24H
                </Button>
                <Button
                  variant={selectedPeriod === '7d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod('7d')}
                >
                  7D
                </Button>
                <Button
                  variant={selectedPeriod === '30d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod('30d')}
                >
                  30D
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={exportTradeJournal}>
                <Download className="h-4 w-4 mr-2" />
                Export Journal
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Profit</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(metrics?.netProfit || 0)}
                </p>
                <p className="text-xs text-gray-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatPercentage(metrics?.dailyReturn || 0)} today
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Portfolio Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(metrics?.portfolioValue || 0)}
                </p>
                <p className="text-xs text-gray-500 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatPercentage(metrics?.weeklyReturn || 0)} this week
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold">
                  {(metrics?.winRate || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {metrics?.totalTrades || 0} total trades
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Max Drawdown</p>
                <p className="text-2xl font-bold text-red-600">
                  {(metrics?.maxDrawdown || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  Current: {(metrics?.currentDrawdown || 0).toFixed(1)}%
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="tokens">Token Analytics</TabsTrigger>
          <TabsTrigger value="risk">Risk Events</TabsTrigger>
          <TabsTrigger value="journal">Trade Journal</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Evolution</TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Portfolio Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Portfolio Value Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString().slice(0, -5)}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Portfolio Value']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="portfolioValue" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Drawdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Drawdown Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString().slice(0, -5)}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: any) => [`${value.toFixed(2)}%`, 'Drawdown']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="drawdown" 
                      stroke="#dc2626" 
                      strokeWidth={2}
                      dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Strategy Mode Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Strategy Mode Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Tooltip />
                    <Pie
                      dataKey="count"
                      data={[
                        { name: 'Conservative', count: history.filter(h => h.strategyMode === 'conservative').length, fill: '#10b981' },
                        { name: 'Scaled', count: history.filter(h => h.strategyMode === 'scaled').length, fill: '#f59e0b' },
                        { name: 'Hyper', count: history.filter(h => h.strategyMode === 'hyper').length, fill: '#ef4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Conservative</p>
                      <p className="text-lg font-semibold text-green-600">
                        {history.filter(h => h.strategyMode === 'conservative').length}
                      </p>
                      <p className="text-xs text-gray-500">days</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Scaled</p>
                      <p className="text-lg font-semibold text-yellow-600">
                        {history.filter(h => h.strategyMode === 'scaled').length}
                      </p>
                      <p className="text-xs text-gray-500">days</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Hyper</p>
                      <p className="text-lg font-semibold text-red-600">
                        {history.filter(h => h.strategyMode === 'hyper').length}
                      </p>
                      <p className="text-xs text-gray-500">days</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Risk Level</span>
                      <span className="font-medium">
                        {history.length > 0 && history[history.length - 1].strategyMode === 'hyper' ? 'High' :
                         history.length > 0 && history[history.length - 1].strategyMode === 'scaled' ? 'Medium' : 'Low'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Current Mode</span>
                      <Badge className={
                        history.length > 0 && history[history.length - 1].strategyMode === 'hyper' ? 'bg-red-100 text-red-800' :
                        history.length > 0 && history[history.length - 1].strategyMode === 'scaled' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'
                      }>
                        {history.length > 0 ? history[history.length - 1].strategyMode : 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Token Performance Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tokens.slice(0, 10).map((token, index) => (
                  <div key={token.symbol} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">{token.symbol}</p>
                        <p className="text-sm text-gray-500">
                          {token.totalTrades} trades • Win Rate: {token.winRate.toFixed(1)}%
                        </p>
                      </div>
                      {token.isLocked && (
                        <Shield className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${token.totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(token.totalROI)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Avg: {formatPercentage(token.avgROI)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk Event History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <div className="space-y-4">
                  {events.slice(0, 20).map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(event.severity)}>
                            {event.severity.toUpperCase()}
                          </Badge>
                          <span className="font-semibold capitalize">
                            {event.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleDateString()} {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {event.description}
                      </p>
                      
                      {event.metrics && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          {event.metrics.portfolioValue && (
                            <div>
                              <span className="text-gray-500">Portfolio:</span>
                              <span className="ml-1 font-medium">
                                {formatCurrency(event.metrics.portfolioValue)}
                              </span>
                            </div>
                          )}
                          {event.metrics.drawdown && (
                            <div>
                              <span className="text-gray-500">Drawdown:</span>
                              <span className="ml-1 font-medium">
                                {event.metrics.drawdown.toFixed(1)}%
                              </span>
                            </div>
                          )}
                          {event.metrics.consecutiveLosses && (
                            <div>
                              <span className="text-gray-500">Losses:</span>
                              <span className="ml-1 font-medium">
                                {event.metrics.consecutiveLosses}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {event.resolution && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 dark:text-green-400 font-medium">Resolved:</span>
                            <span className="text-green-700 dark:text-green-300">
                              {event.resolution.description}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No risk events recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-Time Trade Journal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {journal.length > 0 ? (
                <div className="space-y-3">
                  {journal.slice(0, 50).map((trade) => (
                    <div key={trade.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1 ${getOutcomeColor(trade.outcome)}`}>
                            {trade.outcome === 'win' ? <ArrowUpRight className="h-4 w-4" /> : 
                             trade.outcome === 'loss' ? <ArrowDownRight className="h-4 w-4" /> : 
                             <Activity className="h-4 w-4" />}
                            <span className="font-semibold">{trade.symbol}</span>
                          </div>
                          <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                            {trade.side.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {trade.amount} @ {formatCurrency(trade.price)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(trade.timestamp).toLocaleTimeString()}
                          </p>
                          {trade.pnl !== undefined && (
                            <p className={`text-sm font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(trade.pnl)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {trade.tags.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {trade.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                        <div>
                          <span>Confidence:</span>
                          <span className="ml-1">{trade.confidence}%</span>
                        </div>
                        <div>
                          <span>Strategy:</span>
                          <span className="ml-1 capitalize">{trade.strategyUsed}</span>
                        </div>
                        {trade.roi !== undefined && (
                          <div>
                            <span>ROI:</span>
                            <span className={`ml-1 ${trade.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(trade.roi)}
                            </span>
                          </div>
                        )}
                        <div>
                          <span>Impact:</span>
                          <span className={`ml-1 ${trade.portfolioImpact.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(trade.portfolioImpact.percentageChange)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No trades recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Strategy Evolution Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transitions.length > 0 ? (
                <div className="space-y-4">
                  {transitions.map((transition, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Badge style={{ backgroundColor: getStrategyModeColor(transition.fromMode) }}>
                              {transition.fromMode}
                            </Badge>
                            <ArrowUpRight className="h-4 w-4 text-gray-400" />
                            <Badge style={{ backgroundColor: getStrategyModeColor(transition.toMode) }}>
                              {transition.toMode}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(transition.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {Math.floor(transition.duration / 60)}h {transition.duration % 60}m duration
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>Reason:</strong> {transition.reason}
                      </p>
                      
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">Win Rate:</span>
                          <span className="ml-1 font-medium">{transition.metrics.winRate.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Drawdown:</span>
                          <span className="ml-1 font-medium">{transition.metrics.drawdown.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Confidence:</span>
                          <span className="ml-1 font-medium">{transition.metrics.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No strategy transitions recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}