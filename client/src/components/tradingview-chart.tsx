import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TradingViewChartProps {
  symbol: string;
  mintAddress: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  currentPrice?: number;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

export function TradingViewChart({ 
  symbol, 
  mintAddress, 
  entryPrice, 
  stopLoss, 
  takeProfit,
  currentPrice 
}: TradingViewChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Load TradingView script if not already loaded
    if (!window.TradingView) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => initChart();
      document.head.appendChild(script);
    } else {
      initChart();
    }

    function initChart() {
      if (!chartRef.current || !window.TradingView) return;

      // Clear previous chart
      chartRef.current.innerHTML = '';

      new window.TradingView.widget({
        autosize: true,
        symbol: `SOLANA:${symbol}USD`,
        interval: '5',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: true,
        save_image: false,
        container_id: chartRef.current.id,
        studies: [
          'Volume@tv-basicstudies',
          'RSI@tv-basicstudies'
        ],
        drawings_access: {
          type: 'black',
          tools: [
            { name: 'Trend Line' },
            { name: 'Rectangle' },
            { name: 'Horizontal Line' }
          ]
        },
        // Add trading levels
        studies_overrides: entryPrice ? {
          'paneProperties.background': '#1a1a1a',
          'paneProperties.gridProperties.color': '#2a2a2a',
          // Entry price line
          'scalesProperties.lineColor': '#00ff00',
        } : {},
        overrides: {
          'paneProperties.background': '#1a1a1a',
          'paneProperties.gridProperties.color': '#2a2a2a',
          'scalesProperties.textColor': '#ffffff',
          'scalesProperties.lineColor': '#2a2a2a',
        }
      });
    }
  }, [symbol, mintAddress]);

  return (
    <Card className="h-[500px] bg-gray-900 border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center justify-between">
          <span>{symbol} Live Chart</span>
          <div className="flex gap-2 text-sm">
            {entryPrice && (
              <span className="text-blue-400">Entry: ${entryPrice.toFixed(6)}</span>
            )}
            {currentPrice && (
              <span className="text-green-400">Current: ${currentPrice.toFixed(6)}</span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[400px] p-0">
        <div 
          ref={chartRef}
          id={`tradingview_${mintAddress}`}
          className="w-full h-full"
        />
        
        {/* Trading levels overlay */}
        {(entryPrice || stopLoss || takeProfit) && (
          <div className="absolute top-20 right-4 bg-gray-800/90 rounded-lg p-3 text-sm">
            <div className="text-white font-semibold mb-2">Trading Levels</div>
            {entryPrice && (
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-3 h-0.5 bg-blue-400"></div>
                Entry: ${entryPrice.toFixed(6)}
              </div>
            )}
            {takeProfit && (
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-3 h-0.5 bg-green-400"></div>
                Take Profit: ${takeProfit.toFixed(6)}
              </div>
            )}
            {stopLoss && (
              <div className="flex items-center gap-2 text-red-400">
                <div className="w-3 h-0.5 bg-red-400"></div>
                Stop Loss: ${stopLoss.toFixed(6)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}