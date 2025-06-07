import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { History, Trophy, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { getRecentTrades } from '@/lib/crypto-api';

export function ActivityPanel() {
  const { data: trades, isLoading } = useQuery({
    queryKey: ['/api/trades/recent'],
    queryFn: getRecentTrades,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const formatTimeAgo = (timestamp: string | Date) => {
    const now = new Date().getTime();
    const tradeTime = new Date(timestamp).getTime();
    const diffMinutes = Math.floor((now - tradeTime) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const formatAmount = (amount: string, symbol: string) => {
    const num = parseFloat(amount);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M ${symbol}`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K ${symbol}`;
    }
    return `${num.toFixed(0)} ${symbol}`;
  };

  // Mock performance data
  const performanceStats = {
    totalTrades: 1247,
    winRate: 87.3,
    profitFactor: 2.84,
    avgHoldTime: '4.2h',
    maxDrawdown: 2.1
  };

  // Mock market sentiment
  const marketSentiment = {
    score: 78,
    label: 'Bullish',
    fearGreed: 65,
    volumeTrend: 'increasing' as const,
    socialBuzz: 'high' as const
  };

  return (
    <div className="space-y-6">
      {/* Recent Trades */}
      <Card className="glass-effect neon-border">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <History className="mr-2 h-5 w-5 text-accent" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-accent/10 animate-pulse">
                  <div className="h-8 bg-secondary/50 rounded w-20"></div>
                  <div className="h-8 bg-secondary/50 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {trades?.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between py-2 border-b border-accent/10 last:border-b-0">
                  <div>
                    <div className="flex items-center space-x-2">
                      {trade.side === 'buy' ? (
                        <ArrowUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-red-500" />
                      )}
                      <span className="font-semibold text-sm">{trade.symbol}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {trade.side} • {formatAmount(trade.amount, 'tokens')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-500 font-mono text-sm">
                      +${parseFloat(trade.pnl || '0').toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(trade.timestamp!)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <Card className="glass-effect neon-border">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">Total Trades</span>
              <span className="font-mono font-semibold">{performanceStats.totalTrades.toLocaleString()}</span>
            </div>
            <Progress value={85} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">Win Rate</span>
              <span className="font-mono font-semibold text-green-500">{performanceStats.winRate}%</span>
            </div>
            <Progress value={performanceStats.winRate} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">Profit Factor</span>
              <span className="font-mono font-semibold text-green-500">{performanceStats.profitFactor}x</span>
            </div>
            <Progress value={92} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">Avg. Hold Time</span>
              <span className="font-mono font-semibold">{performanceStats.avgHoldTime}</span>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-muted-foreground">Max Drawdown</span>
              <span className="font-mono font-semibold text-red-500">-{performanceStats.maxDrawdown}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Sentiment */}
      <Card className="glass-effect neon-border">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Activity className="mr-2 h-5 w-5 text-red-500" />
            Market Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-accent/20 border-2 border-green-500/50 mb-4">
              <span className="text-2xl font-bold text-green-500">{marketSentiment.score}</span>
            </div>
            <p className="text-green-500 font-semibold mb-2">{marketSentiment.label}</p>
            <p className="text-xs text-muted-foreground">Based on social sentiment, volume, and technical indicators</p>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fear & Greed</span>
              <span className="text-yellow-500">{marketSentiment.fearGreed} (Greed)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Volume Trend</span>
              <span className="text-green-500">↗ Increasing</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Social Buzz</span>
              <span className="text-accent">High Activity</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
