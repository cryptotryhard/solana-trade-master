import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, StopCircle, Play, Pause } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Position {
  id: string;
  symbol: string;
  mint: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  entryTime: string;
  pnl: number;
  pnlPercent: number;
  stopLoss: number;
  takeProfit: number;
  trailingStop?: number;
  positionSize: number;
  capitalAllocation: number; // Procento z celkového kapitálu
}

interface TradingStats {
  totalCapital: number;
  activePositions: Position[];
  totalTrades: number;
  winRate: number;
  roi: number;
  isActive: boolean;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Mock candlestick data generator pro demo
const generateCandleData = (symbol: string, entryPrice: number, currentPrice: number): CandleData[] => {
  const data: CandleData[] = [];
  const baseTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hodin zpět
  let price = entryPrice * 0.95; // Začneme o něco níže
  
  for (let i = 0; i < 288; i++) { // 5-minutové svíčky za 24 hodin
    const time = baseTime + i * 5 * 60 * 1000;
    const volatility = 0.02; // 2% volatilita
    const trend = (currentPrice - entryPrice) / 288 * i / entryPrice; // Postupný trend
    
    const open = price;
    const change = (Math.random() - 0.5) * volatility + trend;
    const high = open * (1 + Math.abs(change) + Math.random() * 0.01);
    const low = open * (1 - Math.abs(change) - Math.random() * 0.01);
    const close = open * (1 + change);
    
    data.push({
      time,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000000
    });
    
    price = close;
  }
  
  return data;
};

// Komponenta pro jednotlivý graf pozice
const PositionChart = ({ position }: { position: Position }) => {
  const candleData = generateCandleData(position.symbol, position.entryPrice, position.currentPrice);
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold">{position.symbol}</CardTitle>
          <div className="flex gap-2">
            <Badge variant={position.pnl >= 0 ? "default" : "destructive"}>
              {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
            </Badge>
            <Badge variant="outline">
              {position.capitalAllocation.toFixed(1)}% kapitálu
            </Badge>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Entry: ${position.entryPrice.toFixed(6)} | Current: ${position.currentPrice.toFixed(6)} | PnL: ${position.pnl.toFixed(2)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={candleData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                tickFormatter={(time) => new Date(time).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                fontSize={10}
              />
              <YAxis 
                domain={['dataMin * 0.95', 'dataMax * 1.05']}
                tickFormatter={(value) => `$${value.toFixed(6)}`}
                fontSize={10}
              />
              <Tooltip 
                labelFormatter={(time) => new Date(time).toLocaleString('cs-CZ')}
                formatter={(value, name) => [`$${Number(value).toFixed(6)}`, name]}
              />
              
              {/* Cenové čáry */}
              <Line type="monotone" dataKey="close" stroke="#8884d8" strokeWidth={2} dot={false} name="Cena" />
              
              {/* Entry price */}
              <ReferenceLine y={position.entryPrice} stroke="#10B981" strokeDasharray="5 5" label="Entry" />
              
              {/* Stop Loss */}
              <ReferenceLine y={position.stopLoss} stroke="#EF4444" strokeDasharray="5 5" label="Stop Loss" />
              
              {/* Take Profit */}
              <ReferenceLine y={position.takeProfit} stroke="#F59E0B" strokeDasharray="5 5" label="Take Profit" />
              
              {/* Trailing Stop (pokud existuje) */}
              {position.trailingStop && (
                <ReferenceLine y={position.trailingStop} stroke="#8B5CF6" strokeDasharray="3 3" label="Trailing Stop" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Trading levels */}
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Play className="w-3 h-3 text-green-500" />
              <span>Entry: ${position.entryPrice.toFixed(6)}</span>
            </div>
            <div className="flex items-center gap-2">
              <StopCircle className="w-3 h-3 text-red-500" />
              <span>Stop Loss: ${position.stopLoss.toFixed(6)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="w-3 h-3 text-yellow-500" />
              <span>Take Profit: ${position.takeProfit.toFixed(6)}</span>
            </div>
            {position.trailingStop && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-purple-500" />
                <span>Trailing: ${position.trailingStop.toFixed(6)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Komponenta pro alokaci kapitálu
const CapitalAllocation = ({ positions, totalCapital }: { positions: Position[]; totalCapital: number }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alokace kapitálu</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {positions.map((position) => (
            <div key={position.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{position.symbol}</span>
                <span>{position.capitalAllocation.toFixed(1)}% (${(totalCapital * position.capitalAllocation / 100).toFixed(2)})</span>
              </div>
              <Progress 
                value={position.capitalAllocation} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>PnL: ${position.pnl.toFixed(2)}</span>
                <span className={position.pnlPercent >= 0 ? "text-green-500" : "text-red-500"}>
                  {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
          
          {/* Volný kapitál */}
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Volný kapitál</span>
              <span>{(100 - positions.reduce((sum, p) => sum + p.capitalAllocation, 0)).toFixed(1)}%</span>
            </div>
            <Progress 
              value={100 - positions.reduce((sum, p) => sum + p.capitalAllocation, 0)} 
              className="h-2 mt-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AdvancedTradingDashboard() {
  const { data: tradingStats, refetch } = useQuery<TradingStats>({
    queryKey: ['/api/billion-trader/advanced-stats'],
    refetchInterval: 2000,
  });

  const { data: positions } = useQuery<Position[]>({
    queryKey: ['/api/billion-trader/positions-detailed'],
    refetchInterval: 1000,
  });

  // Mock data pro demo účely
  const mockPositions: Position[] = [
    {
      id: '1',
      symbol: 'BONK',
      mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      entryPrice: 0.000018,
      currentPrice: 0.000021,
      amount: 27685200,
      entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      pnl: 86.50,
      pnlPercent: 16.67,
      stopLoss: 0.000015,
      takeProfit: 0.000027,
      trailingStop: 0.000019,
      positionSize: 450,
      capitalAllocation: 28.5
    },
    {
      id: '2',
      symbol: 'MOON',
      mint: 'MoonToken123',
      entryPrice: 0.000345,
      currentPrice: 0.000298,
      amount: 145000,
      entryTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      pnl: -23.15,
      pnlPercent: -13.62,
      stopLoss: 0.000276,
      takeProfit: 0.000483,
      positionSize: 125,
      capitalAllocation: 7.9
    },
    {
      id: '3',
      symbol: 'PEPE2',
      mint: 'PepeToken456',
      entryPrice: 0.00000089,
      currentPrice: 0.00000112,
      amount: 2500000,
      entryTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      pnl: 57.75,
      pnlPercent: 25.84,
      stopLoss: 0.00000071,
      takeProfit: 0.00000156,
      trailingStop: 0.00000098,
      positionSize: 89,
      capitalAllocation: 5.6
    }
  ];

  const activePlaceholder = positions || mockPositions;
  const totalCapital = tradingStats?.totalCapital || 1580;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Pokročilý Trading Dashboard</h1>
        <div className="flex items-center gap-4">
          <Badge variant={tradingStats?.isActive ? "default" : "secondary"} className="px-3 py-1">
            {tradingStats?.isActive ? 'AKTIVNÍ' : 'POZASTAVENO'}
          </Badge>
          <div className="text-right">
            <div className="text-2xl font-bold">${totalCapital.toFixed(2)}</div>
            <div className={`text-sm ${(tradingStats?.roi || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ROI: {(tradingStats?.roi || 0) >= 0 ? '+' : ''}{(tradingStats?.roi || 0).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Statistiky a alokace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trading statistiky</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Aktivní pozice:</span>
                <span className="font-semibold">{activePlaceholder.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Celkem obchodů:</span>
                <span className="font-semibold">{tradingStats?.totalTrades || 22}</span>
              </div>
              <div className="flex justify-between">
                <span>Win rate:</span>
                <span className="font-semibold">{(tradingStats?.winRate || 0.68 * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Alokovaný kapitál:</span>
                <span className="font-semibold">
                  {activePlaceholder.reduce((sum, p) => sum + p.capitalAllocation, 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <CapitalAllocation positions={activePlaceholder} totalCapital={totalCapital} />

        <Card>
          <CardHeader>
            <CardTitle>Portfolio přehled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Celkový PnL:</span>
                <span className={`font-semibold ${activePlaceholder.reduce((sum, p) => sum + p.pnl, 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${activePlaceholder.reduce((sum, p) => sum + p.pnl, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Nejlepší pozice:</span>
                <span className="font-semibold text-green-500">
                  {activePlaceholder.length > 0 ? activePlaceholder.reduce((best, current) => current.pnlPercent > best.pnlPercent ? current : best).symbol : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Nejhorší pozice:</span>
                <span className="font-semibold text-red-500">
                  {activePlaceholder.length > 0 ? activePlaceholder.reduce((worst, current) => current.pnlPercent < worst.pnlPercent ? current : worst).symbol : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafy pozic */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Aktivní pozice s grafy</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {activePlaceholder.map((position) => (
            <PositionChart key={position.id} position={position} />
          ))}
        </div>
      </div>

      {/* Pokud nejsou žádné pozice */}
      {activePlaceholder.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Žádné aktivní pozice</p>
              <p className="text-sm">Bot právě hledá nové trading příležitosti...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}