import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Target, Clock, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface TokenPrice {
  timestamp: number;
  price: number;
  volume: number;
}

interface LiveToken {
  symbol: string;
  mintAddress: string;
  currentPrice: number;
  entryPrice?: number;
  change24h: number;
  change1h: number;
  volume24h: number;
  marketCap: number;
  priceHistory: TokenPrice[];
  status: 'portfolio' | 'queued' | 'monitoring';
  confidence?: number;
  signals?: string[];
  pnl?: number;
  pnlPercent?: number;
}

interface ChartData {
  time: string;
  price: number;
  volume: number;
  change: number;
}

const SparklineChart = ({ data, color = "#3b82f6", height = 40 }: { data: number[]; color?: string; height?: number }) => {
  const chartData = data.map((value, index) => ({
    index,
    value,
    time: `${index * 5}m`
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fillOpacity={1}
          fill={`url(#gradient-${color.replace('#', '')})`}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const TokenChart = ({ token }: { token: LiveToken }) => {
  const chartData: ChartData[] = token.priceHistory.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString('cs-CZ', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    price: item.price,
    volume: item.volume,
    change: ((item.price - (token.entryPrice || item.price)) / (token.entryPrice || item.price)) * 100
  }));

  const isPositive = token.change24h >= 0;
  const chartColor = isPositive ? "#22c55e" : "#ef4444";

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-bold text-white">{token.symbol}</CardTitle>
            <Badge variant={token.status === 'portfolio' ? 'default' : token.status === 'queued' ? 'secondary' : 'outline'}>
              {token.status === 'portfolio' ? 'V PORTFOLIU' : token.status === 'queued' ? 'VE FRONTĚ' : 'SLEDOVÁNÍ'}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white">
              ${token.currentPrice.toFixed(6)}
            </div>
            <div className={`text-sm flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {token.change24h.toFixed(2)}%
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Cenový graf */}
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af" 
                fontSize={10}
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={10}
                tick={{ fill: '#9ca3af' }}
                domain={['dataMin * 0.98', 'dataMax * 1.02']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f9fafb'
                }}
                formatter={(value: any, name: string) => [
                  name === 'price' ? `$${value.toFixed(6)}` : value.toFixed(2),
                  name === 'price' ? 'Cena' : 'Změna %'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={chartColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: chartColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Metriky */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <DollarSign className="w-4 h-4" />
              <span>Market Cap</span>
            </div>
            <div className="text-white font-medium">
              ${(token.marketCap / 1000000).toFixed(2)}M
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Activity className="w-4 h-4" />
              <span>Objem 24h</span>
            </div>
            <div className="text-white font-medium">
              ${(token.volume24h / 1000).toFixed(0)}K
            </div>
          </div>

          {token.entryPrice && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Target className="w-4 h-4" />
                  <span>Vstupní cena</span>
                </div>
                <div className="text-white font-medium">
                  ${token.entryPrice.toFixed(6)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>P&L</span>
                </div>
                <div className={`font-medium ${(token.pnlPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {token.pnlPercent?.toFixed(2)}%
                </div>
              </div>
            </>
          )}
        </div>

        {/* Signály */}
        {token.signals && token.signals.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Aktivní signály</div>
            <div className="flex flex-wrap gap-1">
              {token.signals.map((signal, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {signal}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Confidence skóre */}
        {token.confidence && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">AI Confidence</span>
              <span className="text-sm font-medium text-white">{token.confidence}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  token.confidence >= 80 ? 'bg-green-500' : 
                  token.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${token.confidence}%` }}
              ></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const LiveTokenCharts = () => {
  const [activeTab, setActiveTab] = useState('portfolio');
  
  // Fetch live token data
  const { data: liveTokens = [] } = useQuery({
    queryKey: ['/api/tokens/live-charts'],
    refetchInterval: 5000, // Refresh každých 5 sekund
  });

  // Fetch portfolio positions
  const { data: portfolioPositions = [] } = useQuery({
    queryKey: ['/api/portfolio/positions'],
    refetchInterval: 3000,
  });

  // Fetch queued trades
  const { data: queueData } = useQuery({
    queryKey: ['/api/trades/queue'],
    refetchInterval: 2000,
  });

  const portfolioTokens = (liveTokens as LiveToken[]).filter(token => token.status === 'portfolio');
  const queuedTokens = (liveTokens as LiveToken[]).filter(token => token.status === 'queued');
  const monitoringTokens = (liveTokens as LiveToken[]).filter(token => token.status === 'monitoring');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-400" />
          Live Token Charts
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-400">Live data stream</span>
          </div>
          <div className="text-gray-400">
            <Clock className="w-4 h-4 inline mr-1" />
            Aktualizace každých 5s
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="portfolio" className="data-[state=active]:bg-blue-600">
            Portfolio ({portfolioTokens.length})
          </TabsTrigger>
          <TabsTrigger value="queue" className="data-[state=active]:bg-orange-600">
            Fronta ({queuedTokens.length})
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="data-[state=active]:bg-purple-600">
            Sledování ({monitoringTokens.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4 mt-6">
          {portfolioTokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolioTokens.map((token) => (
                <TokenChart key={token.mintAddress} token={token} />
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Žádné tokeny v portfoliu</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-4 mt-6">
          {queuedTokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {queuedTokens.map((token) => (
                <TokenChart key={token.mintAddress} token={token} />
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Žádné tokeny ve frontě</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4 mt-6">
          {monitoringTokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {monitoringTokens.map((token) => (
                <TokenChart key={token.mintAddress} token={token} />
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-400">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Žádné tokeny ke sledování</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveTokenCharts;