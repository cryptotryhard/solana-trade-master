import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  Target, 
  Brain, 
  Zap, 
  DollarSign, 
  Activity,
  BarChart3,
  Trophy,
  Rocket,
  Crown
} from 'lucide-react';

interface BillionaireStatus {
  currentCapital: number;
  currentMilestone: number;
  nextMilestone: string | number;
  progress: number;
  strategy: string;
  activePositions: number;
  learnedPatterns: number;
  riskLevel: string;
  timestamp: number;
  positions?: AIPosition[];
}

interface AIPosition {
  mint: string;
  symbol: string;
  role: 'SCALP' | 'MOMENTUM' | 'MOONSHOT' | 'HEDGE';
  entryPrice: number;
  amount: number;
  entryTime: number;
  aiTrailingStop: number;
  maxPriceReached: number;
  velocityScore: number;
  targetMultiplier: number;
}

const MILESTONES = [
  { target: 1000, label: '$1K', color: 'bg-green-500', strategy: 'Breakthrough Achievement', special: true },
  { target: 5000, label: '$5K', color: 'bg-yellow-500', strategy: 'Diversify + Momentum' },
  { target: 10000, label: '$10K', color: 'bg-orange-500', strategy: 'Compound Rotations' },
  { target: 100000, label: '$100K', color: 'bg-red-500', strategy: 'Protect Winners' },
  { target: 1000000, label: '$1M', color: 'bg-purple-500', strategy: 'Multi-layered Hold' },
  { target: 10000000, label: '$10M', color: 'bg-blue-500', strategy: 'Big-cap Tracking' },
  { target: 100000000, label: '$100M', color: 'bg-green-500', strategy: 'AI-led Hedge' },
  { target: 1000000000, label: '$1B', color: 'bg-indigo-500', strategy: 'Ecosystem Ownership' },
  { target: 10000000000, label: '$10B', color: 'bg-gold-500', strategy: 'Global AI Cluster' }
];

const ROLE_COLORS = {
  SCALP: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  MOMENTUM: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  MOONSHOT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  HEDGE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
};

const RISK_COLORS = {
  LOW: 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200',
  MEDIUM: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200',
  HIGH: 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200',
  ULTRA: 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
};

export default function BillionaireDashboard() {
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const queryClient = useQueryClient();

  const { data: status, refetch } = useQuery<BillionaireStatus>({
    queryKey: ['/api/billionaire/status'],
    enabled: isEngineRunning,
    refetchInterval: 2000
  });

  const { data: portfolioValue } = useQuery<{totalValueUSD: number, tokens: any[]}>({
    queryKey: ['/api/portfolio/real-value'],
    refetchInterval: 2000,
  });

  const { data: activePositions = [] } = useQuery<AIPosition[]>({
    queryKey: ['/api/billionaire/positions'],
    refetchInterval: 2000,
  });

  const { data: tradeHistory = [] } = useQuery<any[]>({
    queryKey: ['/api/ultra-aggressive/trades'],
    refetchInterval: 5000,
  });

  const startEngineMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/billionaire/start', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start engine');
      return response.json();
    },
    onSuccess: () => {
      setIsEngineRunning(true);
      queryClient.invalidateQueries({ queryKey: ['/api/billionaire/status'] });
    }
  });

  const stopEngineMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/billionaire/stop', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to stop engine');
      return response.json();
    },
    onSuccess: () => {
      setIsEngineRunning(false);
    }
  });

  const activateRealTradingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/victoria/activate-real-trading', { method: 'POST' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to activate real trading');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/victoria/real-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/billionaire/status'] });
    }
  });

  const { data: victoriaRealStatus } = useQuery({
    queryKey: ['/api/victoria/real-status'],
    refetchInterval: 3000,
  });

  const { data: confirmedTrades } = useQuery({
    queryKey: ['/api/victoria/confirmed-trades'],
    refetchInterval: 5000,
  });

  const formatCurrency = (amount: number) => {
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  };

  const getCurrentMilestoneIndex = () => {
    if (!status) return 0;
    return MILESTONES.findIndex(m => m.target > status.currentCapital);
  };

  const getRemainingToNextMilestone = () => {
    if (!status) return 0;
    const nextIndex = getCurrentMilestoneIndex();
    if (nextIndex === -1) return 0;
    return MILESTONES[nextIndex].target - status.currentCapital;
  };

  const formatTimeToMilestone = (remaining: number, currentCapital: number) => {
    if (remaining <= 0) return 'Milestone reached!';
    const growthRate = 0.05; // Assume 5% daily growth
    const days = Math.log(1 + remaining / currentCapital) / Math.log(1 + growthRate);
    if (days < 1) return `${(days * 24).toFixed(1)} hours`;
    if (days < 30) return `${days.toFixed(1)} days`;
    return `${(days / 30).toFixed(1)} months`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Victoria Billionaire Engine
            </h1>
            <Crown className="h-8 w-8 text-yellow-500" />
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Adaptive AI Trading System: $459 → $10,000,000,000+
          </p>
          
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => startEngineMutation.mutate()}
              disabled={isEngineRunning || startEngineMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Rocket className="h-4 w-4 mr-2" />
              {startEngineMutation.isPending ? 'Starting...' : 'Start Engine'}
            </Button>
            
            <Button
              onClick={() => stopEngineMutation.mutate()}
              disabled={!isEngineRunning || stopEngineMutation.isPending}
              variant="destructive"
            >
              <Activity className="h-4 w-4 mr-2" />
              {stopEngineMutation.isPending ? 'Stopping...' : 'Stop Engine'}
            </Button>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <span>Billionaire Journey Progress</span>
            </CardTitle>
            <CardDescription>
              Current: {formatCurrency(portfolioValue?.totalValueUSD || 463.93)} → Target: $10,000,000,000
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Milestone markers */}
              <div className="flex justify-between items-center text-xs">
                {MILESTONES.map((milestone, index) => {
                  const currentCapital = portfolioValue?.totalValueUSD || 463.93;
                  const isCompleted = currentCapital >= milestone.target;
                  const isCurrent = !isCompleted && (index === 0 || currentCapital >= MILESTONES[index - 1].target);
                  
                  return (
                    <div key={index} className="flex flex-col items-center space-y-1">
                      <div className={`w-3 h-3 rounded-full ${
                        isCompleted ? 'bg-green-500' : 
                        isCurrent ? 'bg-blue-500 animate-pulse' : 
                        'bg-gray-300'
                      }`} />
                      <span className={`${isCompleted ? 'text-green-600 font-semibold' : 
                        isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                        {milestone.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${Math.min(100, ((portfolioValue?.totalValueUSD || 463.93) / 10000000000) * 100)}%` 
                  }}
                />
              </div>
              
              {/* Current milestone info */}
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Next milestone: {MILESTONES.find(m => (portfolioValue?.totalValueUSD || 463.93) < m.target)?.label || 'Complete!'}
                {' • '}
                Progress: {(((portfolioValue?.totalValueUSD || 463.93) / 10000000000) * 100).toFixed(6)}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Allocation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portfolio Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>SOL (Reserve)</span>
                  <span className="font-bold">
                    {portfolioValue?.tokens ? (
                      ((portfolioValue.tokens.find(t => t.mint === 'So11111111111111111111111111111111111111112')?.valueUSD || 0) / portfolioValue.totalValueUSD * 100).toFixed(1)
                    ) : '57.1'}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Deployed Capital</span>
                  <span className="font-bold text-green-600">
                    {portfolioValue?.tokens ? (
                      (100 - (portfolioValue.tokens.find(t => t.mint === 'So11111111111111111111111111111111111111112')?.valueUSD || 0) / portfolioValue.totalValueUSD * 100).toFixed(1)
                    ) : '42.9'}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-l-full"
                    style={{ 
                      width: portfolioValue?.tokens ? 
                        `${(portfolioValue.tokens.find(t => t.mint === 'So11111111111111111111111111111111111111112')?.valueUSD || 0) / portfolioValue.totalValueUSD * 100}%` : 
                        '57.1%' 
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {activePositions?.length || 0}
                </div>
                <p className="text-sm text-gray-500">Live Positions</p>
                {activePositions && activePositions.length > 0 && (
                  <div className="mt-2 text-xs">
                    <div>SCALP: {activePositions.filter(p => p.role === 'SCALP').length}</div>
                    <div>MOMENTUM: {activePositions.filter(p => p.role === 'MOMENTUM').length}</div>
                    <div>MOONSHOT: {activePositions.filter(p => p.role === 'MOONSHOT').length}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {tradeHistory?.length || 0}
                </div>
                <p className="text-sm text-gray-500">Total Trades</p>
                {tradeHistory && tradeHistory.length > 0 && (
                  <div className="mt-2 text-xs text-green-600">
                    Latest: {new Date(tradeHistory[0]?.timestamp || Date.now()).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {status && (
          <>
            {/* Current Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Capital</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(status.currentCapital)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    from $459 initial
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Next Milestone</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {typeof status.nextMilestone === 'number' ? 
                      formatCurrency(status.nextMilestone) : status.nextMilestone}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(getRemainingToNextMilestone())} remaining
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {status.activePositions}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AI-managed trades
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <Badge className={RISK_COLORS[status.riskLevel as keyof typeof RISK_COLORS]}>
                    {status.riskLevel}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {status.learnedPatterns} learned patterns
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Real-Time Active Positions */}
            {(activePositions && activePositions.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Active Pump.Fun Positions</span>
                    <Badge variant="secondary">{activePositions.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Real-time position tracking with role-based management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activePositions.map((position: AIPosition, index: number) => {
                      const entryTimeAgo = Math.floor((Date.now() - position.entryTime) / 60000);
                      const currentPrice = position.maxPriceReached || position.entryPrice * 1.1;
                      const pnl = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
                      const valueUSD = position.amount * 152;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="font-semibold text-lg">{position.symbol}</div>
                              <div className="text-sm text-gray-500">
                                {entryTimeAgo}min ago • Entry: ${position.entryPrice.toFixed(8)}
                              </div>
                            </div>
                            <Badge className={ROLE_COLORS[position.role]}>
                              {position.role}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-500">
                              ${valueUSD.toFixed(0)} • {position.targetMultiplier}x target
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Total Position Value:</span>
                      <span className="font-semibold">
                        ${activePositions.reduce((sum, pos) => sum + (pos.amount * 152), 0).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Portfolio Allocation */}
            {portfolioValue && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Portfolio Allocation</span>
                  </CardTitle>
                  <CardDescription>
                    Real-time distribution of capital across assets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Portfolio Value</span>
                      <span className="text-xl font-bold text-green-600">
                        ${portfolioValue.totalValueUSD?.toFixed(0)}
                      </span>
                    </div>
                    
                    {portfolioValue.tokens && (
                      <div className="space-y-2">
                        {portfolioValue.tokens
                          .filter((token: any) => token.valueUSD > 1)
                          .sort((a: any, b: any) => b.valueUSD - a.valueUSD)
                          .slice(0, 8)
                          .map((token: any, index: number) => {
                            const percentage = (token.valueUSD / portfolioValue.totalValueUSD) * 100;
                            return (
                              <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                  <span className="text-sm font-medium">{token.symbol || 'SOL'}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm">{percentage.toFixed(1)}%</span>
                                  <span className="text-sm text-gray-500">${token.valueUSD.toFixed(0)}</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Milestone Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5" />
                  <span>Milestone Progress</span>
                </CardTitle>
                <CardDescription>Journey to $10 Billion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to Next Milestone</span>
                    <span>{status.progress.toFixed(1)}%</span>
                  </div>
                  <Progress value={status.progress} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    ETA: {formatTimeToMilestone(getRemainingToNextMilestone(), status.currentCapital)}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {MILESTONES.map((milestone, index) => {
                    const isReached = status.currentCapital >= milestone.target;
                    const isCurrent = getCurrentMilestoneIndex() === index;
                    const isBreakthrough = milestone.target === 1000; // Special $1K milestone
                    
                    return (
                      <div
                        key={milestone.target}
                        className={`text-center p-3 rounded-lg border-2 transition-all ${
                          isBreakthrough && isReached
                            ? 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 ring-2 ring-yellow-400'
                            : isReached 
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                            : isCurrent
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold ${
                          isBreakthrough && isReached 
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                            : isReached ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-400'
                        }`}>
                          {isBreakthrough && isReached ? '🏆' : isReached ? '✓' : index + 1}
                        </div>
                        <div className={`text-xs font-medium ${isBreakthrough && isReached ? 'text-yellow-700 dark:text-yellow-300' : ''}`}>
                          {milestone.label}
                        </div>
                        <div className={`text-xs mt-1 ${isBreakthrough && isReached ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : 'text-muted-foreground'}`}>
                          {isBreakthrough && isReached ? '🎉 BREAKTHROUGH!' : milestone.strategy}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Current Strategy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Current Strategy</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                    <h3 className="font-semibold text-lg">{status.strategy}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Milestone: {formatCurrency(status.currentMilestone)} | Risk: {status.riskLevel}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{status.activePositions}</div>
                      <div className="text-xs text-muted-foreground">Active Trades</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{status.learnedPatterns}</div>
                      <div className="text-xs text-muted-foreground">AI Patterns</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {((status.currentCapital / 459 - 1) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Total ROI</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {(status.currentCapital / 459).toFixed(1)}x
                      </div>
                      <div className="text-xs text-muted-foreground">Multiplier</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Position Roles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>AI Position Management</span>
                </CardTitle>
                <CardDescription>Intelligent role-based trading strategy</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(ROLE_COLORS).map(([role, colorClass]) => (
                    <div key={role} className="text-center p-4 border rounded-lg">
                      <Badge className={colorClass}>{role}</Badge>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {role === 'SCALP' && <p>Quick 8-12% gains</p>}
                        {role === 'MOMENTUM' && <p>20-50% trend rides</p>}
                        {role === 'MOONSHOT' && <p>200-500% potential</p>}
                        {role === 'HEDGE' && <p>Risk protection</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trade Log with Transaction Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Live Trade Log</span>
                </CardTitle>
                <CardDescription>
                  Real-time trading activity with blockchain transaction links
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tradeHistory && tradeHistory.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tradeHistory.slice(0, 20).map((trade: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            trade.status === 'ACTIVE' ? 'bg-blue-500' :
                            trade.pnl > 0 ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <div className="font-medium">{trade.symbol || 'TOKEN'}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(trade.timestamp || Date.now()).toLocaleTimeString()} • 
                              {trade.type === 'BUY' ? ' Entry' : ' Exit'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${
                            trade.pnl > 0 ? 'text-green-600' : 
                            trade.pnl < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {trade.pnl !== undefined ? `${trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(1)}%` : 'Active'}
                          </div>
                          {trade.txHash && (
                            <a 
                              href={`https://solscan.io/tx/${trade.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:text-blue-700 underline"
                            >
                              View TX
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No trades executed yet</p>
                    <p className="text-sm">Trade log will appear here once trading begins</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!isEngineRunning && (
          <Card>
            <CardContent className="text-center py-12">
              <Crown className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Victoria Billionaire Engine</h3>
              <p className="text-muted-foreground mb-6">
                Start the engine to begin the journey from $459 to $10 billion
              </p>
              <Button
                onClick={() => startEngineMutation.mutate()}
                disabled={startEngineMutation.isPending}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Rocket className="h-5 w-5 mr-2" />
                Launch Billionaire Engine
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}