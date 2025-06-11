import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { queryClient } from '@/lib/queryClient';
import { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Target, Zap, Brain, DollarSign, BarChart3, Eye, ExternalLink, Clock, Shield } from 'lucide-react';
import { LiveTokenCharts } from '@/components/live-token-charts';

interface LiveTrade {
  id: string;
  timestamp: Date;
  tokenSymbol: string;
  type: 'BUY' | 'SELL';
  amountSOL: number;
  amountTokens: number;
  txHash: string;
  status: 'CONFIRMED' | 'PENDING';
  pnl?: number;
  roi?: number;
  entryPrice?: number;
  signals?: string[];
  confidence?: number;
}

interface Position {
  symbol: string;
  balance: number;
  valueUSD: number;
  entryPrice: number;
  currentPrice: number;
  roi: number;
  pnl: number;
  signals?: string[];
  confidence?: number;
  timestamp?: string;
}

interface BotStatus {
  active: boolean;
  mode: string;
  balance: number;
  totalTrades: number;
  pnl24h: number;
  lastUpdate: string;
}

interface AlphaToken {
  symbol: string;
  confidence: number;
  score: number;
  signals: string[];
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  reasoning: string;
  nextAction: 'BUY' | 'WATCH' | 'SKIP';
  timeframe: string;
}

interface QueuedTrade {
  symbol: string;
  action: 'BUY' | 'SELL';
  confidence: number;
  amount: number;
  reasoning: string;
  eta: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Mini sparkline chart component
const SparklineChart = ({ data, color = '#10b981' }: { data: number[]; color?: string }) => {
  if (!data || data.length === 0) return <div className="h-8 w-16 bg-gray-800 rounded"></div>;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 32 - ((value - min) / range) * 32;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width="60" height="32" className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
};

export default function VictoriaControl() {
  const [isLaunched, setIsLaunched] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<LiveTrade | null>(null);

  const { data: botStatus = {} } = useQuery({
    queryKey: ['/api/bot/status'],
    refetchInterval: 2000
  });

  const { data: liveTrades = [] } = useQuery({
    queryKey: ['/api/trades/live'],
    refetchInterval: 1000
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['/api/portfolio/positions'],
    refetchInterval: 3000
  });

  const { data: walletData = {} } = useQuery({
    queryKey: ['/api/wallet/balance/9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d'],
    refetchInterval: 5000
  });

  // Real alpha tokens data from AI analysis
  const { data: alphaTokens = [] } = useQuery({
    queryKey: ['/api/alpha/intelligence'],
    refetchInterval: 10000
  });

  // Real queued trades from execution engine
  const { data: queueData = {} } = useQuery({
    queryKey: ['/api/trades/queue'],
    refetchInterval: 3000
  });

  const queuedTrades: QueuedTrade[] = (queueData as any)?.queue || [];

  const launchMutation = useMutation({
    mutationFn: async (action: string) => {
      const response = await fetch('/api/bot/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot/status'] });
    }
  });

  const handleLaunchToggle = () => {
    if (isLaunched) {
      launchMutation.mutate('stop');
      setIsLaunched(false);
    } else {
      launchMutation.mutate('start');
      setIsLaunched(true);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatSOL = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.0000 SOL';
    return `${amount.toFixed(4)} SOL`;
  };

  const getAlphaColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-500';
      case 'MEDIUM': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            VICTORIA
          </h1>
          <p className="text-gray-400 text-lg">Autonomous AI Trading Engine</p>
        </div>
        
        <Button
          onClick={handleLaunchToggle}
          className={`px-8 py-4 text-lg font-bold rounded-xl transition-all duration-300 ${
            isLaunched 
              ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-red-500/25' 
              : 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 shadow-emerald-500/25'
          } shadow-lg`}
          disabled={launchMutation.isPending}
        >
          {isLaunched ? (
            <>
              <Shield className="w-5 h-5 mr-2" />
              STOP VICTORIA
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2" />
              LAUNCH VICTORIA
            </>
          )}
        </Button>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-6 h-6 text-emerald-400" />
              <Badge className="bg-emerald-500/20 text-emerald-400">LIVE</Badge>
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {(walletData as any)?.solBalance ? formatSOL((walletData as any).solBalance) : '0.0000 SOL'}
            </div>
            <div className="text-sm text-gray-400">Wallet Balance</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              <Badge className="bg-blue-500/20 text-blue-400">TOTAL</Badge>
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {(botStatus as any)?.totalTrades ?? 0}
            </div>
            <div className="text-sm text-gray-400">Total Trades</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-6 h-6 text-yellow-400" />
              <Badge className="bg-yellow-500/20 text-yellow-400">24H</Badge>
            </div>
            <div className={`text-3xl font-bold ${
              ((botStatus as any)?.pnl24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {formatCurrency((botStatus as any)?.pnl24h)}
            </div>
            <div className="text-sm text-gray-400">24h P&L</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-6 h-6 text-emerald-400" />
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${(botStatus as any)?.active ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></div>
                <Badge className={`${(botStatus as any)?.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {(botStatus as any)?.active ? 'ACTIVE' : 'STOPPED'}
                </Badge>
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {(botStatus as any)?.active ? 'ONLINE' : 'OFFLINE'}
            </div>
            <div className="text-sm text-gray-400">Bot Status</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard with Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 bg-gray-800/50 border border-gray-700 h-12">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300 font-medium"
          >
            Trading Overview
          </TabsTrigger>
          <TabsTrigger 
            value="live-charts" 
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-300 font-medium"
          >
            Live Charts
          </TabsTrigger>
          <TabsTrigger 
            value="trades" 
            className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-gray-300 font-medium"
          >
            Live Trades
          </TabsTrigger>
          <TabsTrigger 
            value="positions" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-300 font-medium"
          >
            Portfolio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Alpha Intelligence & Queue */}
        <div className="col-span-4 space-y-6">
          {/* Alpha Scoring */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-blue-400 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Alpha Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                {(alphaTokens as any[]).map((token: any) => (
                  <div key={token.symbol} className="p-4 border-b border-gray-700 last:border-b-0 hover:bg-gray-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-bold text-lg">{token.symbol}</div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getAlphaColor(token.score)}`}>
                          {token.score}
                        </div>
                        <div className="text-xs text-gray-400">ALPHA SCORE</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <SparklineChart 
                        data={[12, 15, 18, 22, 19, 25, 28, 24]} 
                        color={token.change24h > 0 ? '#10b981' : '#ef4444'} 
                      />
                      <div className={`text-sm font-medium ${token.change24h > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {token.change24h > 0 ? '+' : ''}{token.change24h.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {token.signals.map((signal: string) => (
                        <Badge key={signal} className="text-xs bg-blue-500/20 text-blue-400">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-2">{token.reasoning}</div>
                    
                    <div className="flex justify-between items-center">
                      <Badge className={`${
                        token.nextAction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                        token.nextAction === 'WATCH' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {token.nextAction}
                      </Badge>
                      <div className="text-xs text-gray-400">{token.timeframe}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Queued Trades */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-yellow-400 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Next Trades Queued
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-48 overflow-y-auto">
                {queuedTrades.map((trade, index) => (
                  <div key={index} className="p-4 border-b border-gray-700 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold">{trade.symbol}</div>
                      <Badge className={`${getPriorityColor(trade.priority)} text-white text-xs`}>
                        {trade.priority}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm">
                        <span className={`font-medium ${trade.action === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.action}
                        </span>
                        <span className="text-gray-400 ml-1">{trade.amount} SOL</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-400">{trade.confidence}%</div>
                        <div className="text-xs text-gray-400">{trade.eta}</div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400">{trade.reasoning}</div>
                  </div>
                ))}
                
                {queuedTrades.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    No trades queued. Scanning for opportunities...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column - Live Trades */}
        <div className="col-span-4">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-emerald-400 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Live Trades
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {(liveTrades as any[]).map((trade: any) => (
                  <Dialog key={trade.id}>
                    <DialogTrigger asChild>
                      <div className="p-4 border-b border-gray-700 last:border-b-0 hover:bg-gray-800/50 transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={`${trade.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {trade.type}
                            </Badge>
                            <div className="font-bold text-lg">{trade.tokenSymbol}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">
                              {new Date(trade.timestamp).toLocaleTimeString()}
                            </div>
                            <Badge className={`${trade.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {trade.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                          <div>
                            <span className="text-gray-400">Amount: </span>
                            <span className="text-white">{trade.amountSOL.toFixed(4)} SOL</span>
                          </div>
                          {trade.pnl !== undefined && (
                            <div>
                              <span className="text-gray-400">P&L: </span>
                              <span className={trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {formatCurrency(trade.pnl)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-400 font-mono">
                            {trade.txHash.substring(0, 8)}...{trade.txHash.substring(-8)}
                          </div>
                          <Eye className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </DialogTrigger>
                    
                    <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl text-blue-400">
                          Trade Details - {trade.tokenSymbol}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Trade Overview */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-sm text-gray-400">Transaction Hash</div>
                            <div className="font-mono text-sm bg-gray-800 p-2 rounded flex items-center justify-between">
                              <span>{trade.txHash.substring(0, 20)}...</span>
                              <ExternalLink 
                                className="w-4 h-4 text-blue-400 cursor-pointer" 
                                onClick={() => window.open(`https://solscan.io/tx/${trade.txHash}`, '_blank')}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm text-gray-400">Entry Signals</div>
                            <div className="flex flex-wrap gap-1">
                              {(trade.signals || ['Volume Spike', 'Smart Money']).map((signal) => (
                                <Badge key={signal} className="text-xs bg-blue-500/20 text-blue-400">
                                  {signal}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {/* Performance Chart Placeholder */}
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="text-sm text-gray-400 mb-2">Price Performance</div>
                          <div className="h-32 flex items-center justify-center">
                            <SparklineChart 
                              data={[100, 102, 98, 105, 108, 112, 110, 115]} 
                              color="#10b981" 
                            />
                          </div>
                        </div>
                        
                        {/* Trade Metrics */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-400">
                              {trade.roi ? `${trade.roi.toFixed(1)}%` : 'N/A'}
                            </div>
                            <div className="text-sm text-gray-400">ROI</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">
                              {trade.confidence || 85}%
                            </div>
                            <div className="text-sm text-gray-400">Confidence</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-400">
                              {trade.entryPrice ? `$${trade.entryPrice.toFixed(6)}` : 'N/A'}
                            </div>
                            <div className="text-sm text-gray-400">Entry Price</div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
                
                {(liveTrades as any[]).length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    No live trades yet. Launch Victoria to start trading.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Current Positions */}
        <div className="col-span-4">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-purple-400 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Current Positions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {(positions as any[]).map((position: any) => (
                  <div key={position.symbol} className="p-4 border-b border-gray-700 last:border-b-0">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-bold text-lg">{position.symbol || 'Unknown'}</div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          (position.roi ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {(position.roi ?? 0) >= 0 ? '+' : ''}{(position.roi ?? 0).toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-400">ROI</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <SparklineChart 
                        data={[100, 105, 102, 108, 112, 115, 110, 118]} 
                        color={(position.roi ?? 0) >= 0 ? '#10b981' : '#ef4444'} 
                      />
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(position.valueUSD)}</div>
                        <div className="text-xs text-gray-400">Current Value</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Entry: </span>
                        <span className="text-white">{formatCurrency(position.entryPrice)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">P&L: </span>
                        <span className={(position.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {formatCurrency(position.pnl)}
                        </span>
                      </div>
                    </div>
                    
                    {position.signals && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {position.signals.map((signal: string) => (
                          <Badge key={signal} className="text-xs bg-purple-500/20 text-purple-400">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {(positions as any[]).length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    No active positions.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="live-charts" className="space-y-6">
          <LiveTokenCharts />
        </TabsContent>

        <TabsContent value="trades" className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-orange-400 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Live Trading Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(liveTrades as any[]).map((trade: any) => (
                  <div key={trade.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <Badge className={`${
                          trade.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.type}
                        </Badge>
                        <span className="font-bold text-lg">{trade.tokenSymbol}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          {new Date(trade.timestamp).toLocaleTimeString()}
                        </div>
                        <Badge className={`${
                          trade.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {trade.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Amount: </span>
                        <span className="text-white">{formatSOL(trade.amountSOL)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Tokens: </span>
                        <span className="text-white">{(trade.amountTokens || 0).toLocaleString()}</span>
                      </div>
                      {trade.pnl !== undefined && (
                        <div>
                          <span className="text-gray-400">P&L: </span>
                          <span className={`${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(trade.pnl)}
                          </span>
                        </div>
                      )}
                      {trade.roi !== undefined && (
                        <div>
                          <span className="text-gray-400">ROI: </span>
                          <span className={`${trade.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trade.roi.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {trade.txHash && (
                      <div className="mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs"
                          onClick={() => window.open(`https://solscan.io/tx/${trade.txHash}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View on Solscan
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {(liveTrades as any[]).length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    No live trades yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-purple-400 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Portfolio Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(positions as any[]).map((position: any) => (
                  <div key={position.symbol} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-lg">{position.symbol}</div>
                        <div className="text-sm text-gray-400">
                          Balance: {(position.balance || 0).toLocaleString()} tokens
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">
                          {formatCurrency(position.valueUSD)}
                        </div>
                        <div className={`text-sm ${(position.roi || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {(position.roi || 0) >= 0 ? '+' : ''}{(position.roi || 0).toFixed(2)}% ROI
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Entry: </span>
                        <span className="text-white">${(position.entryPrice || 0).toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Current: </span>
                        <span className="text-white">${(position.currentPrice || 0).toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">P&L: </span>
                        <span className={`${(position.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(position.pnl || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Confidence: </span>
                        <span className="text-white">{position.confidence || 'N/A'}%</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(positions as any[]).length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    No active positions.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}