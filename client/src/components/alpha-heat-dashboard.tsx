import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Minus, Flame, DollarSign, Target, Activity, Users, Zap, Filter, Info } from 'lucide-react';

interface HeatmapEntry {
  id: string;
  type: 'pattern' | 'wallet' | 'token';
  name: string;
  symbol?: string;
  profit: number;
  profitPercentage: number;
  volume: number;
  trades: number;
  winRate: number;
  avgHoldTime: number;
  hotness: number;
  trend: 'rising' | 'falling' | 'stable';
  lastUpdate: string;
  sparklineData: number[];
}

interface ProfitMetrics {
  totalProfit: number;
  totalVolume: number;
  totalTrades: number;
  avgWinRate: number;
  topPerformer: HeatmapEntry | null;
  hottestItem: HeatmapEntry | null;
  period: string;
}

export function AlphaHeatDashboard() {
  const [typeFilter, setTypeFilter] = useState<'all' | 'pattern' | 'wallet' | 'token'>('all');
  const [selectedEntry, setSelectedEntry] = useState<HeatmapEntry | null>(null);

  const { data: heatmapData, isLoading: heatmapLoading } = useQuery<HeatmapEntry[]>({
    queryKey: ['/api/heatmap/data'],
    refetchInterval: 10000
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<ProfitMetrics>({
    queryKey: ['/api/heatmap/metrics/24h'],
    refetchInterval: 30000
  });

  const { data: topPerformers } = useQuery<HeatmapEntry[]>({
    queryKey: ['/api/heatmap/top-performers'],
    refetchInterval: 15000
  });

  const { data: hottestItems } = useQuery<HeatmapEntry[]>({
    queryKey: ['/api/heatmap/hottest'],
    refetchInterval: 10000
  });

  const { data: patternData } = useQuery<HeatmapEntry[]>({
    queryKey: ['/api/heatmap/by-type/pattern'],
    refetchInterval: 15000
  });

  const { data: walletData } = useQuery<HeatmapEntry[]>({
    queryKey: ['/api/heatmap/by-type/wallet'],
    refetchInterval: 15000
  });

  const { data: tokenData } = useQuery<HeatmapEntry[]>({
    queryKey: ['/api/heatmap/by-type/token'],
    refetchInterval: 15000
  });

  const getHotnessColor = (hotness: number) => {
    if (hotness >= 80) return 'bg-red-500';
    if (hotness >= 60) return 'bg-orange-500';
    if (hotness >= 40) return 'bg-yellow-500';
    if (hotness >= 20) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const getHotnessIntensity = (hotness: number) => {
    return Math.max(0.3, hotness / 100);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'falling': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pattern': return <Zap className="h-4 w-4" />;
      case 'wallet': return <Users className="h-4 w-4" />;
      case 'token': return <DollarSign className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatSOL = (amount: number) => `${amount.toFixed(3)} SOL`;
  const formatPercentage = (pct: number) => `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;

  if (heatmapLoading || metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          <h2 className="text-2xl font-bold">Alpha Heat</h2>
        </div>
        <div className="text-center text-muted-foreground">Loading real-time profit data...</div>
      </div>
    );
  }

  const filteredData = heatmapData?.filter(item => 
    typeFilter === 'all' || item.type === typeFilter
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          <h2 className="text-2xl font-bold">Alpha Heat</h2>
          <Badge variant="outline">Live 24h</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pattern">Patterns</SelectItem>
              <SelectItem value="wallet">Wallets</SelectItem>
              <SelectItem value="token">Tokens</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Global Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <div className="text-sm text-muted-foreground">Total Profit</div>
              </div>
              <div className="text-2xl font-bold text-green-500">
                {formatSOL(metrics.totalProfit)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <div className="text-sm text-muted-foreground">Total Trades</div>
              </div>
              <div className="text-2xl font-bold">{metrics.totalTrades}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                <div className="text-sm text-muted-foreground">Avg Win Rate</div>
              </div>
              <div className="text-2xl font-bold">{metrics.avgWinRate.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <div className="text-sm text-muted-foreground">Volume</div>
              </div>
              <div className="text-2xl font-bold">
                {formatSOL(metrics.totalVolume)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="heatmap" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="heatmap">Live Heatmap</TabsTrigger>
          <TabsTrigger value="performers">Top Performers</TabsTrigger>
          <TabsTrigger value="hottest">Hottest Items</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5" />
                Real-Time Profit Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredData && filteredData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredData.slice(0, 12).map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-5 rounded-xl border-2 transition-all duration-300 hover:scale-105 cursor-pointer ${
                        entry.hotness >= 80 ? 'bg-red-500/20 border-red-500/50' :
                        entry.hotness >= 60 ? 'bg-orange-500/20 border-orange-500/50' :
                        entry.hotness >= 40 ? 'bg-yellow-500/20 border-yellow-500/50' :
                        entry.hotness >= 20 ? 'bg-blue-500/20 border-blue-500/50' :
                        'bg-gray-500/20 border-gray-500/50'
                      }`}
                      style={{
                        background: entry.hotness >= 80 ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))' :
                                   entry.hotness >= 60 ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(249, 115, 22, 0.05))' :
                                   entry.hotness >= 40 ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(234, 179, 8, 0.05))' :
                                   entry.hotness >= 20 ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))' :
                                   'linear-gradient(135deg, rgba(107, 114, 128, 0.15), rgba(107, 114, 128, 0.05))'
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`p-2 rounded-lg ${
                            entry.hotness >= 80 ? 'bg-red-500/30' :
                            entry.hotness >= 60 ? 'bg-orange-500/30' :
                            entry.hotness >= 40 ? 'bg-yellow-500/30' :
                            entry.hotness >= 20 ? 'bg-blue-500/30' :
                            'bg-gray-500/30'
                          }`}>
                            {getTypeIcon(entry.type)}
                          </div>
                          <div className="font-bold text-lg text-white drop-shadow-lg truncate">
                            {entry.symbol || entry.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getTrendIcon(entry.trend)}
                          <Badge 
                            variant="outline" 
                            className={`text-sm font-bold px-3 py-1 ${
                              entry.hotness >= 80 ? 'bg-red-500 border-red-400 text-white' :
                              entry.hotness >= 60 ? 'bg-orange-500 border-orange-400 text-white' :
                              entry.hotness >= 40 ? 'bg-yellow-500 border-yellow-400 text-black' :
                              entry.hotness >= 20 ? 'bg-blue-500 border-blue-400 text-white' :
                              'bg-gray-500 border-gray-400 text-white'
                            }`}
                          >
                            {entry.hotness.toFixed(0)}° Heat
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Profit</span>
                          <span className={`font-bold text-sm ${entry.profitPercentage > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatPercentage(entry.profitPercentage)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Volume</span>
                          <span className="text-sm font-medium">
                            {formatSOL(entry.volume)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Trades</span>
                          <span className="text-sm font-medium">{entry.trades}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Win Rate</span>
                          <span className="text-sm font-medium">{entry.winRate.toFixed(0)}%</span>
                        </div>

                        <Progress 
                          value={entry.hotness} 
                          className="h-2 mt-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No active heat data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Top Performers (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topPerformers && topPerformers.length > 0 ? (
                <div className="space-y-3">
                  {topPerformers.map((performer, index) => (
                    <div key={performer.id} className="p-4 bg-secondary/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                            index === 1 ? 'bg-gray-500/20 text-gray-500' :
                            index === 2 ? 'bg-orange-500/20 text-orange-500' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{performer.symbol || performer.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {performer.type}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-500">
                            {formatPercentage(performer.profitPercentage)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatSOL(performer.profit)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No performance data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hottest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Hottest Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hottestItems && hottestItems.length > 0 ? (
                <div className="space-y-3">
                  {hottestItems.map((item) => (
                    <div key={item.id} className="p-4 bg-secondary/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(item.type)}
                          <div>
                            <div className="font-medium">{item.symbol || item.name}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {item.type} • {item.trades} trades
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(item.trend)}
                          <Badge className={`${getHotnessColor(item.hotness)} text-white border-none`}>
                            {item.hotness.toFixed(0)}° Heat
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Profit</div>
                          <div className={`font-bold ${item.profitPercentage > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatPercentage(item.profitPercentage)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Volume</div>
                          <div className="font-medium">{formatSOL(item.volume)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Win Rate</div>
                          <div className="font-medium">{item.winRate.toFixed(0)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No hot items detected
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {selectedEntry && (
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedEntry.type === 'pattern' && <Activity className="w-5 h-5" />}
                {selectedEntry.type === 'wallet' && <Users className="w-5 h-5" />}
                {selectedEntry.type === 'token' && <Zap className="w-5 h-5" />}
                {selectedEntry.name}
                {selectedEntry.symbol && (
                  <Badge variant="outline">{selectedEntry.symbol}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-500">Profit</div>
                    <div className={`text-lg font-bold ${selectedEntry.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedEntry.profit >= 0 ? '+' : ''}${selectedEntry.profit.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-500">ROI</div>
                    <div className={`text-lg font-bold ${selectedEntry.profitPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedEntry.profitPercentage >= 0 ? '+' : ''}{selectedEntry.profitPercentage.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-500">Win Rate</div>
                    <div className="text-lg font-bold">{selectedEntry.winRate.toFixed(1)}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-500">Trades</div>
                    <div className="text-lg font-bold">{selectedEntry.trades}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Hotness & Trend */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Hotness Level</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{selectedEntry.hotness}%</span>
                    <div className={`w-3 h-3 rounded-full ${getHotnessColor(selectedEntry.hotness)} animate-pulse`} />
                  </div>
                </div>
                <Progress value={selectedEntry.hotness} className="h-3" />
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Trend</span>
                  <div className="flex items-center gap-2">
                    {selectedEntry.trend === 'rising' && <TrendingUp className="w-4 h-4 text-green-500" />}
                    {selectedEntry.trend === 'falling' && <TrendingDown className="w-4 h-4 text-red-500" />}
                    {selectedEntry.trend === 'stable' && <Minus className="w-4 h-4 text-gray-500" />}
                    <span className="capitalize">{selectedEntry.trend}</span>
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Volume</div>
                  <div className="font-medium">{formatSOL(selectedEntry.volume)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Avg Hold Time</div>
                  <div className="font-medium">{selectedEntry.avgHoldTime.toFixed(1)}h</div>
                </div>
              </div>

              {/* Sparkline Chart */}
              {selectedEntry.sparklineData && selectedEntry.sparklineData.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Performance Chart</div>
                  <div className="h-20 bg-gray-50 dark:bg-gray-800 rounded flex items-end justify-between px-2 py-1">
                    {selectedEntry.sparklineData.map((value, index) => (
                      <div
                        key={index}
                        className="bg-blue-500 w-1 rounded-t"
                        style={{
                          height: `${Math.max(2, (value / Math.max(...selectedEntry.sparklineData)) * 100)}%`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Last Update */}
              <div className="text-xs text-gray-500 text-center">
                Last updated: {new Date(selectedEntry.lastUpdate).toLocaleString()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}