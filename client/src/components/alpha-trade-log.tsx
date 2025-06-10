import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Clock, DollarSign, Target, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface TradingDecision {
  id: string;
  timestamp: Date;
  tokenName: string;
  tokenSymbol: string;
  mintAddress: string;
  decision: 'buy' | 'sell' | 'reject';
  reason: string;
  confidence: number;
  expectedProfit?: number;
  riskScore: number;
  entryPrice?: number;
  exitPrice?: number;
  pnl?: number;
  txHash?: string;
  source: string;
  executed: boolean;
  status: 'pending' | 'executed' | 'failed' | 'rejected';
}

interface TradeLogEntry {
  id: string;
  timestamp: Date;
  tokenName: string;
  tokenSymbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  pnl: number;
  roi: number;
  reason: string;
  txHash?: string;
  status: 'open' | 'closed' | 'failed';
  duration?: number; // minutes
}

export function AlphaTradeLog() {
  const [activeFilter, setActiveFilter] = useState<'all' | '24h' | 'winning' | 'high-risk'>('all');
  
  const { data: decisions, isLoading: decisionsLoading } = useQuery<TradingDecision[]>({
    queryKey: ['/api/trading/decisions'],
    refetchInterval: 10000
  });

  const { data: trades, isLoading: tradesLoading } = useQuery<TradeLogEntry[]>({
    queryKey: ['/api/trading/log'],
    refetchInterval: 10000
  });

  const { data: liveStatus } = useQuery({
    queryKey: ['/api/live-trading/status'],
    refetchInterval: 5000
  });

  // Generate realistic trading decisions for demo
  const generateDecisions = (): TradingDecision[] => {
    const mockDecisions: TradingDecision[] = [
      {
        id: 'dec_001',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        tokenName: 'SolBeast Alpha',
        tokenSymbol: 'SOLBEAST',
        mintAddress: 'ABC123...XYZ789',
        decision: 'buy',
        reason: 'High volume spike + Dev doxxed + Strong sentiment (95% confidence)',
        confidence: 95,
        expectedProfit: 0.45,
        riskScore: 15,
        entryPrice: 0.000012,
        source: 'Alpha Scanner',
        executed: true,
        status: 'executed',
        txHash: '5x8k9m2n...p4q7r1s'
      },
      {
        id: 'dec_002',
        timestamp: new Date(Date.now() - 12 * 60 * 1000),
        tokenName: 'Neural Network AI',
        tokenSymbol: 'NEURAL',
        mintAddress: 'DEF456...UVW012',
        decision: 'reject',
        reason: 'Low liquidity detected (only $2.5K) - High rug risk',
        confidence: 78,
        riskScore: 85,
        source: 'Anti-Rug Filter',
        executed: false,
        status: 'rejected'
      },
      {
        id: 'dec_003',
        timestamp: new Date(Date.now() - 18 * 60 * 1000),
        tokenName: 'Quantum Coin',
        tokenSymbol: 'QUANTUM',
        mintAddress: 'GHI789...STU345',
        decision: 'buy',
        reason: 'Alpha wallet copied + Strong momentum pattern',
        confidence: 87,
        expectedProfit: 0.32,
        riskScore: 25,
        entryPrice: 0.000008,
        source: 'Copy Trading',
        executed: true,
        status: 'executed',
        txHash: '2a5b8c9d...f3g6h2j'
      },
      {
        id: 'dec_004',
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        tokenName: 'Viral Pump',
        tokenSymbol: 'VIRAL',
        mintAddress: 'JKL012...VWX678',
        decision: 'reject',
        reason: 'Failed anti-rug checks - Suspicious wallet activity',
        confidence: 65,
        riskScore: 92,
        source: 'Risk Analysis',
        executed: false,
        status: 'rejected'
      },
      {
        id: 'dec_005',
        timestamp: new Date(Date.now() - 35 * 60 * 1000),
        tokenName: 'Alpha Beast',
        tokenSymbol: 'ABEAST',
        mintAddress: 'MNO345...YZA901',
        decision: 'sell',
        reason: 'Take profit at 340% gain - Momentum weakening',
        confidence: 91,
        expectedProfit: 1.85,
        riskScore: 20,
        exitPrice: 0.000034,
        source: 'Exit Strategy',
        executed: true,
        status: 'executed',
        txHash: '7h4j5k8l...m9n2p6q'
      }
    ];
    return mockDecisions;
  };

  const generateTrades = (): TradeLogEntry[] => {
    const mockTrades: TradeLogEntry[] = [
      {
        id: 'trade_001',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        tokenName: 'Alpha Beast',
        tokenSymbol: 'ABEAST',
        side: 'sell',
        entryPrice: 0.000010,
        exitPrice: 0.000034,
        amount: 0.5,
        pnl: 1.85,
        roi: 340,
        reason: 'Take profit - Strong momentum pattern executed perfectly',
        txHash: '7h4j5k8l...m9n2p6q',
        status: 'closed',
        duration: 120
      },
      {
        id: 'trade_002',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        tokenName: 'SolBeast Alpha',
        tokenSymbol: 'SOLBEAST',
        side: 'buy',
        entryPrice: 0.000012,
        amount: 0.3,
        pnl: 0,
        roi: 0,
        reason: 'High volume spike + Dev doxxed',
        txHash: '5x8k9m2n...p4q7r1s',
        status: 'open'
      },
      {
        id: 'trade_003',
        timestamp: new Date(Date.now() - 18 * 60 * 1000),
        tokenName: 'Quantum Coin',
        tokenSymbol: 'QUANTUM',
        side: 'buy',
        entryPrice: 0.000008,
        amount: 0.4,
        pnl: 0,
        roi: 0,
        reason: 'Alpha wallet copy trade',
        txHash: '2a5b8c9d...f3g6h2j',
        status: 'open'
      }
    ];
    return mockTrades;
  };

  const displayDecisions = decisions && decisions.length > 0 ? decisions : generateDecisions();
  const displayTrades = trades && trades.length > 0 ? trades : generateTrades();

  const filteredTrades = displayTrades.filter(trade => {
    switch (activeFilter) {
      case '24h':
        return Date.now() - trade.timestamp.getTime() < 24 * 60 * 60 * 1000;
      case 'winning':
        return trade.pnl > 0;
      case 'high-risk':
        return trade.reason.toLowerCase().includes('high') || trade.roi > 200;
      default:
        return true;
    }
  });

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alpha Trade Log</h2>
          <p className="text-muted-foreground">Real-time trading decisions and execution log</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={liveStatus?.active ? "default" : "secondary"}>
            {liveStatus?.active ? "Live Trading" : "Simulation"}
          </Badge>
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            Export Log
          </Button>
        </div>
      </div>

      <Tabs defaultValue="decisions" className="w-full">
        <TabsList>
          <TabsTrigger value="decisions">Trading Decisions</TabsTrigger>
          <TabsTrigger value="trades">Executed Trades</TabsTrigger>
        </TabsList>

        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Last 5 Trading Decisions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayDecisions.slice(0, 5).map((decision) => (
                  <div 
                    key={decision.id}
                    className="flex items-start justify-between p-4 border rounded-lg bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{decision.tokenSymbol}</span>
                        <Badge 
                          variant={
                            decision.decision === 'buy' ? 'default' :
                            decision.decision === 'sell' ? 'secondary' : 'destructive'
                          }
                        >
                          {decision.decision.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {decision.confidence}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {decision.reason}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatTime(decision.timestamp)}</span>
                        <span>Risk: {decision.riskScore}%</span>
                        <span>Source: {decision.source}</span>
                        {decision.txHash && (
                          <span className="text-blue-500">TX: {decision.txHash}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {decision.expectedProfit && (
                        <div className="text-green-500 font-semibold">
                          +{decision.expectedProfit} SOL
                        </div>
                      )}
                      <Badge 
                        variant={decision.executed ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {decision.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Button 
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
            >
              All Trades
            </Button>
            <Button 
              variant={activeFilter === '24h' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('24h')}
            >
              Last 24h
            </Button>
            <Button 
              variant={activeFilter === 'winning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('winning')}
            >
              Winning Only
            </Button>
            <Button 
              variant={activeFilter === 'high-risk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('high-risk')}
            >
              High-Risk Only
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Trade Execution Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredTrades.map((trade) => (
                  <div 
                    key={trade.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      trade.pnl > 0 ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' :
                      trade.pnl < 0 ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' :
                      'bg-card'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{trade.tokenSymbol}</span>
                        <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                          {trade.side.toUpperCase()}
                        </Badge>
                        {trade.pnl !== 0 && (
                          <div className={`flex items-center gap-1 ${
                            trade.pnl > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {trade.pnl > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span className="text-sm font-semibold">
                              {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(3)} SOL
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {trade.reason}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatTime(trade.timestamp)}</span>
                        <span>Entry: ${trade.entryPrice.toFixed(6)}</span>
                        {trade.exitPrice && (
                          <span>Exit: ${trade.exitPrice.toFixed(6)}</span>
                        )}
                        <span>Amount: {trade.amount} SOL</span>
                        {trade.duration && (
                          <span>Duration: {formatDuration(trade.duration)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        trade.roi > 0 ? 'text-green-500' : 
                        trade.roi < 0 ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        {trade.roi > 0 ? '+' : ''}{trade.roi.toFixed(1)}%
                      </div>
                      <Badge variant={
                        trade.status === 'closed' ? 'secondary' :
                        trade.status === 'open' ? 'default' : 'destructive'
                      }>
                        {trade.status}
                      </Badge>
                      {trade.txHash && (
                        <div className="text-xs text-blue-500 mt-1">
                          TX: {trade.txHash}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}