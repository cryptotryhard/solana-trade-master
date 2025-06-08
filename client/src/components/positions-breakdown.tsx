import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";

interface Position {
  symbol: string;
  mintAddress: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  entryTime: string;
  unrealizedPnL: number;
  roi: number;
  priceChange: number;
  pnlUsd: number;
  timeHeld: number;
  status: 'profitable' | 'losing' | 'flat';
}

export function PositionsBreakdown() {
  const { data: positions = [], isLoading } = useQuery<Position[]>({
    queryKey: ["/api/portfolio/positions"],
    refetchInterval: 5000
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Active Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading positions...</div>
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Active Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">No active positions</div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Active Positions ({positions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {positions.map((position, index) => (
            <div 
              key={`${position.symbol}-${index}`}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">{position.symbol}</h3>
                  <Badge 
                    variant={position.status === 'profitable' ? 'default' : 
                            position.status === 'losing' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {position.side.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {position.priceChange > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`font-medium ${
                    position.priceChange > 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {position.priceChange > 0 ? '+' : ''}{position.priceChange.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Entry Price</div>
                  <div className="font-medium">${position.entryPrice.toFixed(6)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Current Price</div>
                  <div className="font-medium">${position.currentPrice.toFixed(6)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Quantity</div>
                  <div className="font-medium">{position.quantity.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Time Held</div>
                  <div className="font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(position.timeHeld)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <div className="text-muted-foreground text-sm">Unrealized P&L</div>
                  <div className={`font-semibold ${
                    position.pnlUsd > 0 ? 'text-green-500' : 
                    position.pnlUsd < 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    {position.pnlUsd > 0 ? '+' : ''}${position.pnlUsd.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground text-sm">ROI</div>
                  <div className={`font-semibold ${
                    position.roi > 0 ? 'text-green-500' : 
                    position.roi < 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    {position.roi > 0 ? '+' : ''}{position.roi.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}