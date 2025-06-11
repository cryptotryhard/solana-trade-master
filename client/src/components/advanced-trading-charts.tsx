import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Target, Shield, ExternalLink, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine, ReferenceArea } from 'recharts';

interface TradeEntry {
  timestamp: number;
  price: number;
  type: 'BUY' | 'SELL';
  size: number;
}

interface TradingPosition {
  id: string;
  symbol: string;
  mintAddress: string;
  entryPrice: number;
  currentPrice: number;
  entryTime: Date;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  trailingStop: {
    enabled: boolean;
    percentage: number;
    currentLevel: number;
    highWaterMark: number;
  };
  takeProfit?: number;
  stopLoss?: number;
  status: 'OPEN' | 'CLOSED';
  priceHistory: Array<{
    timestamp: number;
    price: number;
    volume: number;
  }>;
  trades: TradeEntry[];
}

interface ChartData {
  timestamp: number;
  price: number;
  volume: number;
  ma20?: number;
  ma50?: number;
  support?: number;
  resistance?: number;
}

const TradingChart = ({ position }: { position: TradingPosition }) => {
  const [timeframe, setTimeframe] = useState<'5m' | '15m' | '1h' | '4h'>('15m');
  const [showIndicators, setShowIndicators] = useState(true);
  
  // Calculate moving averages and support/resistance
  const enhancedData: ChartData[] = position.priceHistory.map((point, index, array) => {
    const ma20 = index >= 19 ? 
      array.slice(index - 19, index + 1).reduce((sum, p) => sum + p.price, 0) / 20 : undefined;
    const ma50 = index >= 49 ? 
      array.slice(index - 49, index + 1).reduce((sum, p) => sum + p.price, 0) / 50 : undefined;
    
    return {
      ...point,
      ma20,
      ma50,
      support: position.entryPrice * 0.85, // 15% below entry
      resistance: position.entryPrice * 1.25 // 25% above entry
    };
  });

  const formatPrice = (value: number) => {
    if (value < 0.001) return `$${value.toFixed(6)}`;
    if (value < 1) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(3)}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('cs-CZ', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const trailingStopColor = position.trailingStop.enabled ? '#f59e0b' : '#6b7280';
  const pnlColor = position.pnl >= 0 ? '#10b981' : '#ef4444';

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-white">{position.symbol}</CardTitle>
            <Badge variant={position.status === 'OPEN' ? 'default' : 'secondary'} className="bg-blue-600">
              {position.status}
            </Badge>
            {position.trailingStop.enabled && (
              <Badge className="bg-yellow-600">
                Trailing Stop -{position.trailingStop.percentage}%
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://dexscreener.com/solana/${position.mintAddress}`, '_blank')}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              DexScreener
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://pump.fun/${position.mintAddress}`, '_blank')}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Pump.fun
            </Button>
          </div>
        </div>
        
        {/* Position metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <span className="text-gray-400 text-sm">Entry Price</span>
            <div className="text-white font-medium">{formatPrice(position.entryPrice)}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Current Price</span>
            <div className="text-white font-medium">{formatPrice(position.currentPrice)}</div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">P&L</span>
            <div className={`font-medium ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPrice(position.pnl)} ({position.pnlPercent.toFixed(2)}%)
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Quantity</span>
            <div className="text-white font-medium">{position.quantity.toLocaleString()}</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Timeframe selector */}
        <div className="flex space-x-2 mb-4">
          {(['5m', '15m', '1h', '4h'] as const).map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe(tf)}
              className={timeframe === tf ? 'bg-blue-600' : 'border-gray-700 text-gray-300'}
            >
              {tf}
            </Button>
          ))}
        </div>

        {/* Main price chart */}
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={enhancedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                tickFormatter={formatPrice}
                stroke="#6b7280"
                fontSize={12}
                domain={['dataMin * 0.95', 'dataMax * 1.05']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelFormatter={(label) => formatTime(Number(label))}
                formatter={(value: any, name: string) => [
                  formatPrice(Number(value)), 
                  name === 'price' ? 'Price' : 
                  name === 'ma20' ? 'MA20' : 
                  name === 'ma50' ? 'MA50' : name
                ]}
              />
              
              {/* Main price line */}
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
              />
              
              {/* Moving averages */}
              {showIndicators && (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="ma20" 
                    stroke="#f59e0b" 
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ma50" 
                    stroke="#8b5cf6" 
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </>
              )}
              
              {/* Entry price line */}
              <ReferenceLine 
                y={position.entryPrice} 
                stroke="#10b981" 
                strokeDasharray="3 3"
                label={{ value: "Entry", position: "right" }}
              />
              
              {/* Trailing stop line */}
              {position.trailingStop.enabled && (
                <ReferenceLine 
                  y={position.trailingStop.currentLevel} 
                  stroke={trailingStopColor}
                  strokeWidth={2}
                  label={{ 
                    value: `Trailing Stop (${formatPrice(position.trailingStop.currentLevel)})`, 
                    position: "right" 
                  }}
                />
              )}
              
              {/* Take profit line */}
              {position.takeProfit && (
                <ReferenceLine 
                  y={position.takeProfit} 
                  stroke="#10b981" 
                  strokeDasharray="8 4"
                  label={{ value: "Take Profit", position: "right" }}
                />
              )}
              
              {/* Stop loss line */}
              {position.stopLoss && (
                <ReferenceLine 
                  y={position.stopLoss} 
                  stroke="#ef4444" 
                  strokeDasharray="8 4"
                  label={{ value: "Stop Loss", position: "right" }}
                />
              )}
              
              {/* Trade entry/exit markers */}
              {position.trades.map((trade, index) => (
                <ReferenceLine 
                  key={index}
                  x={trade.timestamp}
                  stroke={trade.type === 'BUY' ? '#10b981' : '#ef4444'}
                  strokeWidth={2}
                  label={{ 
                    value: trade.type, 
                    position: "top",
                    style: { fontSize: '10px' }
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Strategy indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Trailing Stop Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-white">Trailing Stop</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-400">
                  Current Level: <span className="text-yellow-400">{formatPrice(position.trailingStop.currentLevel)}</span>
                </div>
                <div className="text-xs text-gray-400">
                  High Water: <span className="text-green-400">{formatPrice(position.trailingStop.highWaterMark)}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Percentage: <span className="text-white">{position.trailingStop.percentage}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Management */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-white">Risk Management</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-400">
                  Max Loss: <span className="text-red-400">-15%</span>
                </div>
                <div className="text-xs text-gray-400">
                  Target Profit: <span className="text-green-400">+25%</span>
                </div>
                <div className="text-xs text-gray-400">
                  Risk/Reward: <span className="text-white">1:1.67</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-white">Performance</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-400">
                  Hold Time: <span className="text-white">
                    {Math.floor((Date.now() - position.entryTime.getTime()) / (1000 * 60))}m
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  Best Price: <span className="text-green-400">{formatPrice(position.trailingStop.highWaterMark)}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Trades: <span className="text-white">{position.trades.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export const AdvancedTradingCharts = () => {
  const { data: positions = [] } = useQuery({
    queryKey: ['/api/portfolio/positions'],
    refetchInterval: 2000,
  });

  const { data: livePositions = [] } = useQuery({
    queryKey: ['/api/trading/positions/detailed'],
    refetchInterval: 3000,
  });

  // Transform positions into detailed trading positions with price history
  const tradingPositions: TradingPosition[] = positions.map((pos: any) => ({
    id: pos.id,
    symbol: pos.symbol,
    mintAddress: pos.mintAddress || 'unknown',
    entryPrice: pos.entryPrice || pos.price,
    currentPrice: pos.currentPrice || pos.price,
    entryTime: new Date(pos.timestamp || Date.now()),
    quantity: pos.quantity || pos.shares || 1,
    pnl: pos.pnl || 0,
    pnlPercent: pos.pnlPercent || 0,
    trailingStop: {
      enabled: true,
      percentage: 15,
      currentLevel: (pos.entryPrice || pos.price) * 0.85,
      highWaterMark: Math.max(pos.currentPrice || pos.price, pos.entryPrice || pos.price)
    },
    takeProfit: (pos.entryPrice || pos.price) * 1.25,
    stopLoss: (pos.entryPrice || pos.price) * 0.85,
    status: 'OPEN' as const,
    priceHistory: generateMockPriceHistory(pos.entryPrice || pos.price),
    trades: [
      {
        timestamp: new Date(pos.timestamp || Date.now()).getTime(),
        price: pos.entryPrice || pos.price,
        type: 'BUY' as const,
        size: pos.quantity || pos.shares || 1
      }
    ]
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Advanced Trading Charts</h2>
        <Badge className="bg-blue-600">
          {tradingPositions.length} Active Positions
        </Badge>
      </div>

      {tradingPositions.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Active Positions</h3>
            <p className="text-gray-400">
              Positions will appear here when Victoria executes trades
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {tradingPositions.map((position) => (
            <TradingChart key={position.id} position={position} />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to generate realistic price history
function generateMockPriceHistory(basePrice: number) {
  const history = [];
  const now = Date.now();
  const points = 100; // Last 100 data points
  
  for (let i = points; i >= 0; i--) {
    const timestamp = now - (i * 5 * 60 * 1000); // 5-minute intervals
    const randomFactor = 0.95 + (Math.random() * 0.1); // ±5% volatility
    const trendFactor = 1 + (Math.random() - 0.5) * 0.02; // ±1% trend
    const price = basePrice * randomFactor * Math.pow(trendFactor, i);
    
    history.push({
      timestamp,
      price: Math.max(price, basePrice * 0.7), // Min 30% below entry
      volume: Math.random() * 1000000 + 100000
    });
  }
  
  return history;
}

export default AdvancedTradingCharts;