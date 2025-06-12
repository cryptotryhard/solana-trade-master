import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Brain, 
  Shield,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface RealTrade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  amount: number;
  txHash: string;
  timestamp: string;
  status: 'confirmed';
}

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  profit: number;
  roi: number;
  timestamp: string;
  txHash: string;
}

interface AIDecision {
  id: string;
  timestamp: string;
  tokenSymbol: string;
  decision: 'BUY' | 'SELL' | 'HOLD' | 'IGNORE';
  confidence: number;
  reasoning: string[];
  executed: boolean;
  outcome?: {
    roi?: number;
    pnl?: number;
  };
}

interface BotStatus {
  active: boolean;
  mode: string;
  totalTrades: number;
  successRate: number;
}

export default function VictoriaMasterDashboard() {
  const { data: trades = [], isLoading: tradesLoading } = useQuery<RealTrade[]>({
    queryKey: ['/api/trades/live'],
    refetchInterval: 2000
  });

  const { data: positions = [], isLoading: positionsLoading } = useQuery<Position[]>({
    queryKey: ['/api/portfolio/positions'],
    refetchInterval: 3000
  });

  const { data: aiDecisions = [], isLoading: aiLoading } = useQuery<AIDecision[]>({
    queryKey: ['/api/ai/decisions'],
    refetchInterval: 5000
  });

  const { data: botStatus, isLoading: statusLoading } = useQuery<BotStatus>({
    queryKey: ['/api/bot/status'],
    refetchInterval: 1000
  });

  const { data: walletBalance } = useQuery({
    queryKey: ['/api/wallet/balance/9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d'],
    refetchInterval: 5000
  });

  // Calculate portfolio metrics
  const totalProfit = positions.reduce((sum, pos) => sum + pos.profit, 0);
  const avgROI = positions.length > 0 ? positions.reduce((sum, pos) => sum + pos.roi, 0) / positions.length : 0;
  const totalVolume = trades.reduce((sum, trade) => sum + trade.amount, 0);
  
  // AI Performance metrics
  const executedDecisions = aiDecisions.filter(d => d.executed);
  const profitableDecisions = executedDecisions.filter(d => d.outcome && d.outcome.roi! > 0);
  const aiWinRate = executedDecisions.length > 0 ? (profitableDecisions.length / executedDecisions.length) * 100 : 0;

  const formatTxHash = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-6)}`;
  const formatCurrency = (amount: number) => `$${Math.abs(amount).toFixed(2)}`;
  const formatPercent = (percent: number) => `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            VICTORIA TRADING ENGINE
          </h1>
          <p className="text-gray-400 mt-2">Autonomous AI-Powered Solana Trading System</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant={botStatus?.active ? 'default' : 'destructive'} className="px-4 py-2">
            <Activity className="w-4 h-4 mr-2" />
            {botStatus?.active ? 'ACTIVE' : 'OFFLINE'}
          </Badge>
          <div className="text-right">
            <div className="text-2xl font-bold text-cyan-400">
              {walletBalance?.balance?.toFixed(3) || '0.000'} SOL
            </div>
            <div className="text-sm text-gray-400">Available Balance</div>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Trades</CardTitle>
            <Zap className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{trades.length}</div>
            <p className="text-xs text-gray-400">Confirmed executions</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(totalProfit)}
            </div>
            <p className="text-xs text-gray-400">{formatPercent(avgROI)} avg ROI</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">AI Win Rate</CardTitle>
            <Brain className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{aiWinRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-400">{executedDecisions.length} decisions</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalVolume.toFixed(3)} SOL</div>
            <p className="text-xs text-gray-400">Total traded</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Trades */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-cyan-400">Recent Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {trades.slice(0, 8).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-green-900 text-green-300">
                      {trade.type.toUpperCase()}
                    </Badge>
                    <div>
                      <div className="font-semibold text-white">{trade.symbol}</div>
                      <div className="text-sm text-gray-400">{trade.amount} SOL</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-cyan-400 hover:text-cyan-300"
                      onClick={() => window.open(`https://solscan.io/tx/${trade.txHash}`, '_blank')}
                    >
                      {formatTxHash(trade.txHash)}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                    <div className="text-xs text-gray-500">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Positions */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-purple-400">Active Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {positions.map((position) => (
                <div key={position.id} className="p-3 bg-gray-800 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-white">{position.symbol}</div>
                    <Badge 
                      variant={position.roi >= 0 ? 'default' : 'destructive'}
                      className={position.roi >= 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}
                    >
                      {formatPercent(position.roi)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">P&L</div>
                      <div className={position.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatCurrency(position.profit)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Quantity</div>
                      <div className="text-white">{position.quantity.toLocaleString()}</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-cyan-400 hover:text-cyan-300 mt-2"
                    onClick={() => window.open(`https://solscan.io/tx/${position.txHash}`, '_blank')}
                  >
                    View TX {formatTxHash(position.txHash)}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Decision Log */}
      <Card className="bg-gray-900 border-gray-700 mt-8">
        <CardHeader>
          <CardTitle className="text-amber-400 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Decision Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {aiDecisions.slice(0, 6).map((decision) => (
              <div key={decision.id} className="p-4 bg-gray-800 rounded border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={decision.decision === 'BUY' ? 'default' : decision.decision === 'IGNORE' ? 'destructive' : 'secondary'}
                      className={
                        decision.decision === 'BUY' ? 'bg-green-900 text-green-300' :
                        decision.decision === 'IGNORE' ? 'bg-red-900 text-red-300' :
                        'bg-gray-700 text-gray-300'
                      }
                    >
                      {decision.decision}
                    </Badge>
                    <span className="font-semibold text-white">{decision.tokenSymbol}</span>
                    <span className="text-sm text-gray-400">({decision.confidence}% confidence)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {decision.executed ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(decision.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">
                    <strong>Reasoning:</strong>
                  </div>
                  <ul className="text-sm text-gray-400 space-y-1">
                    {decision.reasoning.slice(0, 3).map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                  
                  {decision.outcome && (
                    <div className="mt-3 p-2 bg-gray-700 rounded">
                      <div className="text-sm">
                        <span className="text-gray-400">Outcome: </span>
                        <span className={decision.outcome.roi! >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatPercent(decision.outcome.roi!)} ROI
                        </span>
                        {decision.outcome.pnl && (
                          <span className="ml-2 text-gray-300">
                            ({formatCurrency(decision.outcome.pnl!)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer Status */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>VICTORIA AI Trading Engine v2.0 | Real-time blockchain execution | 
          Last update: {new Date().toLocaleTimeString()}</p>
        <p className="mt-1">🔒 Secure • 🚀 Autonomous • 💎 Profitable</p>
      </div>
    </div>
  );
}