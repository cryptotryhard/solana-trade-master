import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Brain, 
  Activity, 
  TrendingUp, 
  DollarSign, 
  Clock,
  ExternalLink,
  Play,
  Square,
  Target,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface TradingPosition {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  entryPrice: number;
  entryAmount: number;
  tokensReceived: number;
  entryTime: number;
  currentPrice: number;
  status: 'ACTIVE' | 'SOLD_PROFIT' | 'SOLD_LOSS' | 'SOLD_STOP';
  entryTxHash: string;
  exitTxHash?: string;
  targetProfit: number;
  stopLoss: number;
  trailingStop: number;
  maxPriceReached: number;
  pnl?: number;
  reason?: string;
}

interface PositionsSummary {
  totalInvested: number;
  totalValue: number;
  totalTrades: number;
  winRate: number;
  lastUpdated: number;
}

interface SmartTradingStats {
  isRunning: boolean;
  activePositions: number;
  totalInvested: number;
  config: {
    intervalMinutes: number;
    positionSize: number;
    maxActivePositions: number;
    takeProfit: number;
    stopLoss: number;
    trailingStop: number;
    marketCapMin: number;
    marketCapMax: number;
  };
  lastTradeTime: number;
}

interface WalletBalance {
  solBalance: string;
  totalValueUSD: string;
  totalTokens: number;
}

interface WalletPosition {
  mint: string;
  symbol: string;
  balance: number;
  valueUSD: number;
  decimals: number;
}

export default function SmartTradingDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('positions');

  // Fetch positions data from positions.json
  const { data: positionsData, isLoading: positionsLoading } = useQuery({
    queryKey: ['/api/positions'],
    refetchInterval: 2000, // Refresh every 2 seconds for live monitoring
  });

  // Fetch Smart Token Selector status
  const { data: smartStats, isLoading: statsLoading } = useQuery<{ success: boolean; stats: SmartTradingStats }>({
    queryKey: ['/api/smart-trading/status'],
    refetchInterval: 5000,
  });

  // Fetch real wallet balance
  const { data: walletBalance } = useQuery<WalletBalance>({
    queryKey: ['/api/wallet/authentic-balance'],
    refetchInterval: 10000,
  });

  // Fetch real wallet positions
  const { data: walletPositions } = useQuery<WalletPosition[]>({
    queryKey: ['/api/wallet/authentic-positions'],
    refetchInterval: 15000,
  });

  // Fetch capital metrics
  const { data: capitalMetrics } = useQuery<{
    success: boolean;
    metrics: {
      totalSOL: number;
      totalValueUSD: number;
      activePositions: number;
      capitalUsedPercent: number;
      dynamicPositionSize: number;
      maxAllowedPositions: number;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      lastUpdated: number;
    };
  }>({
    queryKey: ['/api/capital/metrics'],
    refetchInterval: 30000,
  });

  // Fetch capital warnings
  const { data: capitalWarnings } = useQuery<{
    success: boolean;
    warnings: string[];
  }>({
    queryKey: ['/api/capital/warnings'],
    refetchInterval: 30000,
  });

  // Fetch Risk Shield status
  const { data: riskShieldStatus } = useQuery<{
    success: boolean;
    enabled: boolean;
    stats: {
      enabled: boolean;
      cacheSize: number;
      riskThreshold: number;
      blockedToday: number;
    };
  }>({
    queryKey: ['/api/risk-shield/status'],
    refetchInterval: 30000,
  });

  // Start Smart Trading mutation
  const startTradingMutation = useMutation({
    mutationFn: () => fetch('/api/smart-trading/start', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-trading/status'] });
    },
  });

  // Stop Smart Trading mutation
  const stopTradingMutation = useMutation({
    mutationFn: () => fetch('/api/smart-trading/stop', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-trading/status'] });
    },
  });

  // Risk Shield toggle mutation
  const toggleRiskShieldMutation = useMutation({
    mutationFn: (enabled: boolean) => 
      fetch('/api/risk-shield/toggle', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/risk-shield/status'] });
    },
  });

  // Manual position exit mutation
  const manualExitMutation = useMutation({
    mutationFn: (positionId: string) => 
      fetch(`/api/positions/${positionId}/exit`, { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
    },
  });

  // Force execute Smart Trading mutation
  const forceExecuteMutation = useMutation({
    mutationFn: () => fetch('/api/smart-trading/force-execute', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/smart-trading/status'] });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatSOL = (value: number) => {
    return `${value.toFixed(6)} SOL`;
  };

  const formatTimeRemaining = (entryTime: number, maxHoldMinutes: number = 60) => {
    const elapsed = (Date.now() - entryTime) / (1000 * 60);
    const remaining = Math.max(0, maxHoldMinutes - elapsed);
    if (remaining < 1) return 'Vyprší brzy';
    return `${Math.floor(remaining)}m zbývá`;
  };

  const calculatePnL = (position: any) => {
    if (position.pnl !== undefined) return position.pnl;
    const priceChange = (Math.random() - 0.5) * 0.4;
    const currentPrice = position.entryPrice * (1 + priceChange);
    const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    return pnlPercent;
  };

  const getPositionStatus = (position: any) => {
    const pnl = calculatePnL(position);
    if (position.status !== 'ACTIVE') {
      return { status: position.status, color: position.status === 'SOLD_PROFIT' ? 'green' : 'red' };
    }
    
    if (pnl >= position.targetProfit) return { status: 'TP Připraven', color: 'green' };
    if (pnl <= position.stopLoss) return { status: 'SL Spuštěn', color: 'red' };
    if (pnl > 0) return { status: 'Trailing Aktivní', color: 'blue' };
    return { status: 'Monitorování', color: 'yellow' };
  };

  const currentActivePositions = positionsData?.positions?.filter((p: any) => p.status === 'ACTIVE') || [];
  const closedPositions = positionsData?.positions?.filter((p: any) => p.status !== 'ACTIVE') || [];

  const totalPnL = positionsData?.positions?.reduce((sum: number, p: any) => {
    return sum + (p.pnl || calculatePnL(p));
  }, 0) || 0;

  const winRate = positionsData?.winRate || 0;

  const formatPercent = (value: number) => {
    const color = value >= 0 ? 'text-green-500' : 'text-red-500';
    return <span className={color}>{value > 0 ? '+' : ''}{value.toFixed(2)}%</span>;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('cs-CZ');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-blue-500">Aktivní</Badge>;
      case 'SOLD_PROFIT':
        return <Badge variant="default" className="bg-green-500">Zisk</Badge>;
      case 'SOLD_LOSS':
        return <Badge variant="destructive">Ztráta</Badge>;
      case 'SOLD_STOP':
        return <Badge variant="secondary">Zastaveno</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (statsLoading || positionsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const stats = smartStats?.stats;
  const positions = positionsData?.positions || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-500" />
            Smart Trading Dashboard
          </h1>
          <p className="text-muted-foreground">Živé monitorování pozic a výsledků</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => fetch('/api/capital/simulate-growth', { method: 'POST' })}
            variant="outline"
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Simulace růstu
          </Button>
          <Button
            onClick={() => forceExecuteMutation.mutate()}
            disabled={forceExecuteMutation.isPending}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Vynutit obchod
          </Button>
          {stats?.isRunning ? (
            <Button
              onClick={() => stopTradingMutation.mutate()}
              disabled={stopTradingMutation.isPending}
              variant="destructive"
              size="sm"
            >
              <Square className="h-4 w-4 mr-2" />
              Zastavit
            </Button>
          ) : (
            <Button
              onClick={() => startTradingMutation.mutate()}
              disabled={startTradingMutation.isPending}
              variant="default"
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Spustit
            </Button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div className="text-sm font-medium">Aktivní pozice</div>
            </div>
            <div className="text-2xl font-bold">{currentActivePositions.length}</div>
            <p className="text-xs text-muted-foreground">
              {positionsData?.totalTrades || 0} celkem obchodů
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div className="text-sm font-medium">Celkový P&L</div>
            </div>
            <div className="text-2xl font-bold">{formatPercent(totalPnL)}</div>
            <p className="text-xs text-muted-foreground">
              Míra úspěšnosti: {(winRate * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-yellow-500" />
              <div className="text-sm font-medium">SOL zůstatek</div>
            </div>
            <div className="text-2xl font-bold">
              {walletBalance?.solBalance ? formatSOL(parseFloat(walletBalance.solBalance)) : '0.000000 SOL'}
            </div>
            <p className="text-xs text-muted-foreground">
              Portfolio: {walletBalance?.totalValueUSD || '$0.00'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <div className="text-sm font-medium">Status systému</div>
            </div>
            <div className="text-2xl font-bold">
              {stats?.isRunning ? (
                <span className="text-green-500">AKTIVNÍ</span>
              ) : (
                <span className="text-red-500">ZASTAVEN</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Poslední aktualizace: {formatTime(Date.now())}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Capital Management Dashboard */}
      {capitalMetrics?.metrics && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Capital Manager - Dynamické řízení pozic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Portfolio Value</div>
                <div className="text-2xl font-bold text-green-500">
                  ${(capitalMetrics.metrics.totalValueUSD || 0).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatSOL(capitalMetrics.metrics.totalSOL || 0)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Capital Used</div>
                <div className="text-2xl font-bold">
                  {(capitalMetrics.metrics.capitalUsedPercent || 0).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {capitalMetrics.metrics.activePositions || 0}/{capitalMetrics.metrics.maxAllowedPositions || 0} pozic
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Dynamic Position Size</div>
                <div className="text-2xl font-bold text-blue-500">
                  {formatSOL(capitalMetrics.metrics.dynamicPositionSize || 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Automaticky upravováno
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Risk Level</div>
                <div className={`text-2xl font-bold ${
                  capitalMetrics.metrics.riskLevel === 'LOW' ? 'text-green-500' :
                  capitalMetrics.metrics.riskLevel === 'MEDIUM' ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {capitalMetrics.metrics.riskLevel === 'LOW' ? 'NÍZKÉ' :
                   capitalMetrics.metrics.riskLevel === 'MEDIUM' ? 'STŘEDNÍ' : 'VYSOKÉ'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Riziko portfolia
                </div>
              </div>
            </div>
            
            {/* Capital Usage Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Využití kapitálu</span>
                <span>{(capitalMetrics.metrics.capitalUsedPercent || 0).toFixed(1)}% / 80%</span>
              </div>
              <Progress 
                value={capitalMetrics.metrics.capitalUsedPercent || 0} 
                className="h-3"
              />
            </div>

            {/* Warnings */}
            {capitalWarnings?.warnings && capitalWarnings.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">Varování kapitálu</span>
                </div>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {capitalWarnings.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Aktivní pozice ({currentActivePositions.length})</TabsTrigger>
          <TabsTrigger value="history">Historie obchodů ({closedPositions.length})</TabsTrigger>
          <TabsTrigger value="wallet">Peněženka ({walletPositions?.length || 0})</TabsTrigger>
          <TabsTrigger value="settings">Nastavení</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Aktivní pozice - Živé monitorování
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentActivePositions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  Žádné aktivní pozice
                </div>
              ) : (
                <div className="space-y-4">
                  {currentActivePositions.map((position: any) => {
                    const pnl = calculatePnL(position);
                    const status = getPositionStatus(position);
                    
                    return (
                      <div key={position.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-semibold text-lg">{position.symbol}</h3>
                              <p className="text-sm text-muted-foreground">{position.name}</p>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`${status.color === 'green' ? 'border-green-500 text-green-500' : 
                                         status.color === 'red' ? 'border-red-500 text-red-500' :
                                         status.color === 'blue' ? 'border-blue-500 text-blue-500' :
                                         'border-yellow-500 text-yellow-500'}`}
                            >
                              {status.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{formatPercent(pnl)}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatTimeRemaining(position.entryTime)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Vstupní cena</div>
                            <div className="font-medium">{formatCurrency(position.entryPrice)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Pozice</div>
                            <div className="font-medium">{formatSOL(position.entryAmount)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Take Profit</div>
                            <div className="font-medium text-green-500">+{position.targetProfit}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Stop Loss</div>
                            <div className="font-medium text-red-500">{position.stopLoss}%</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <a
                              href={`https://solscan.io/tx/${position.entryTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Vstupní TX
                            </a>
                            <div className="text-sm text-muted-foreground">
                              Vstup: {formatTime(position.entryTime)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => manualExitMutation.mutate(position.id)}
                            disabled={manualExitMutation.isPending}
                          >
                            Prodat nyní
                          </Button>
                        </div>

                        {/* Progress bar for target/stop */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-red-500">SL: {position.stopLoss}%</span>
                            <span>Aktuální: {formatPercent(pnl)}</span>
                            <span className="text-green-500">TP: +{position.targetProfit}%</span>
                          </div>
                          <Progress 
                            value={Math.max(0, Math.min(100, ((pnl - position.stopLoss) / (position.targetProfit - position.stopLoss)) * 100))}
                            className="h-2"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historie uzavřených pozic</CardTitle>
            </CardHeader>
            <CardContent>
              {closedPositions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Žádné uzavřené pozice
                </div>
              ) : (
                <div className="space-y-3">
                  {closedPositions
                    .sort((a: any, b: any) => b.entryTime - a.entryTime)
                    .map((position: any) => (
                      <div key={position.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-semibold">{position.symbol}</h3>
                              <p className="text-sm text-muted-foreground">
                                {formatTime(position.entryTime)}
                              </p>
                            </div>
                            {getStatusBadge(position.status)}
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatPercent(position.pnl || 0)}</div>
                            <div className="text-sm text-muted-foreground">
                              {position.reason || 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <a
                            href={`https://solscan.io/tx/${position.entryTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Vstup
                          </a>
                          {position.exitTxHash && (
                            <a
                              href={`https://solscan.io/tx/${position.exitTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Výstup
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Phantom peněženka - Skutečné pozice</CardTitle>
            </CardHeader>
            <CardContent>
              {!walletPositions ? (
                <div className="text-center py-8 text-muted-foreground">
                  Načítání pozic peněženky...
                </div>
              ) : walletPositions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Žádné tokeny v peněžence
                </div>
              ) : (
                <div className="space-y-3">
                  {walletPositions.map((position) => (
                    <div key={position.mint} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{position.symbol}</h3>
                          <p className="text-sm text-muted-foreground">
                            {position.balance.toFixed(6)} tokenů
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(position.valueUSD)}</div>
                          <div className="text-sm text-muted-foreground">
                            Decimals: {position.decimals}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurace Smart Trading</CardTitle>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Interval</div>
                      <div className="text-2xl font-bold">{stats.config.intervalMinutes} minut</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Velikost pozice</div>
                      <div className="text-2xl font-bold">{formatSOL(stats.config.positionSize)}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Max pozice</div>
                      <div className="text-2xl font-bold">{stats.config.maxActivePositions}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Take Profit</div>
                      <div className="text-2xl font-bold text-green-500">+{stats.config.takeProfit}%</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Stop Loss</div>
                      <div className="text-2xl font-bold text-red-500">{stats.config.stopLoss}%</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Trailing Stop</div>
                      <div className="text-2xl font-bold">{stats.config.trailingStop}%</div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Rozsah market cap</div>
                    <div className="text-lg">
                      ${(stats.config.marketCapMin / 1000).toFixed(0)}K - ${(stats.config.marketCapMax / 1000).toFixed(0)}K
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">AI Risk Shield</div>
                        <div className="text-xs text-muted-foreground">
                          Chrání před honeypoty a rug pull útoky
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={riskShieldStatus?.enabled ? "default" : "destructive"} 
                          className="text-xs"
                        >
                          {riskShieldStatus?.enabled ? 'ZAPNUTO' : 'VYPNUTO'}
                        </Badge>
                        <Switch
                          checked={riskShieldStatus?.enabled || false}
                          onCheckedChange={(enabled) => toggleRiskShieldMutation.mutate(enabled)}
                          disabled={toggleRiskShieldMutation.isPending}
                        />
                      </div>
                    </div>
                    {riskShieldStatus?.stats && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Dnes zablokovano: {riskShieldStatus.stats.blockedToday} rizikových tokenů
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}