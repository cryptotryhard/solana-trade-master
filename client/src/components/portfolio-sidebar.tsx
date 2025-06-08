import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { PieChart, Bot, Shield, Circle, Play, Square } from 'lucide-react';
import { getPortfolio } from '@/lib/crypto-api';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AchievementsPanel } from './achievements-panel';
import { ProfitVault } from './profit-vault';

interface PortfolioSidebarProps {
  userId: number;
}

export function PortfolioSidebar({ userId }: PortfolioSidebarProps) {
  const [maxTradeSize, setMaxTradeSize] = useState([5]);
  const [stopLoss, setStopLoss] = useState([8]);
  const { toast } = useToast();

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['/api/portfolio', userId],
    queryFn: () => getPortfolio(userId),
  });

  const { data: botStatus } = useQuery({
    queryKey: ['/api/bot/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/bot/status');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const controlBotMutation = useMutation({
    mutationFn: async (action: { action: 'start' | 'stop', maxTradeSize?: number, stopLoss?: number }) => {
      const response = await apiRequest('POST', '/api/bot/control', action);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot/status'] });
      toast({
        title: data.status.active ? "AI Bot Started" : "AI Bot Stopped",
        description: data.status.active ? "Trading engine is now active" : "Trading engine has been stopped",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to control trading bot",
        variant: "destructive",
      });
    },
  });

  const toggleBot = () => {
    const action = botStatus?.active ? 'stop' : 'start';
    controlBotMutation.mutate({ 
      action, 
      maxTradeSize: maxTradeSize[0], 
      stopLoss: stopLoss[0] 
    });
  };

  if (isLoading || !portfolio) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-effect neon-border animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-secondary/50 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <Card className="glass-effect neon-border">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <PieChart className="mr-2 h-5 w-5 text-accent" />
            Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-sm">Total Balance</span>
              <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">+2,847%</span>
            </div>
            <div className="text-2xl font-bold font-mono">${portfolio.totalBalance}</div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-sm">24h P&L</span>
            </div>
            <div className="text-lg font-mono text-green-500">+${portfolio.dailyPnl}</div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-sm">Active Positions</span>
            </div>
            <div className="text-lg font-mono">{portfolio.activePositions}</div>
          </div>
        </CardContent>
      </Card>

      {/* AI Bot Control */}
      <Card className="glass-effect neon-border">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Bot className="mr-2 h-5 w-5 text-green-500" />
            AI Trading Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <div className="flex items-center space-x-2">
              <Circle className={`w-2 h-2 rounded-full animate-pulse ${botStatus?.active ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-sm font-semibold ${botStatus?.active ? 'text-green-500' : 'text-red-500'}`}>
                {botStatus?.active ? 'Active' : 'Stopped'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Win Rate</span>
            <span className="text-green-500 font-mono">{portfolio.winRate}%</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Trades Today</span>
            <span className="font-mono">47</span>
          </div>
          
          <Button
            onClick={toggleBot}
            disabled={controlBotMutation.isPending}
            className={`w-full font-semibold py-3 transition-all duration-300 ${
              botStatus?.active
                ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                : 'bg-gradient-to-r from-green-500 to-accent hover:from-green-600 hover:to-accent/80'
            } disabled:opacity-50`}
          >
            {controlBotMutation.isPending ? (
              'Processing...'
            ) : botStatus?.active ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop Bot
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Bot
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Risk Management */}
      <Card className="glass-effect neon-border">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Shield className="mr-2 h-5 w-5 text-yellow-500" />
            Risk Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Max Trade Size</label>
            <Slider
              value={maxTradeSize}
              onValueChange={setMaxTradeSize}
              max={20}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{maxTradeSize[0]}%</span>
              <span>Conservative</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Stop Loss</label>
            <Slider
              value={stopLoss}
              onValueChange={setStopLoss}
              max={15}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{stopLoss[0]}%</span>
              <span>Moderate</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Panel */}
      <AchievementsPanel />

      {/* Profit Vault */}
      <ProfitVault />
    </div>
  );
}
