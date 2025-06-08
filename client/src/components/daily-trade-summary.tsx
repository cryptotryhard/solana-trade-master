import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, TrendingUp, TrendingDown, Target, Award } from "lucide-react";

interface DailySummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netPnL: number;
  largestWin: number;
  largestLoss: number;
  averageWin: number;
  averageLoss: number;
}

export function DailyTradeSummary() {
  const { data: summary, isLoading } = useQuery<DailySummary>({
    queryKey: ["/api/trade/daily-summary"],
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Today's Trading Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading daily summary...</div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Today's Trading Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">No trading data available</div>
        </CardContent>
      </Card>
    );
  }

  const getWinRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-500";
    if (rate >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getWinRateBadge = (rate: number) => {
    if (rate >= 90) return { variant: "default" as const, text: "Excellent" };
    if (rate >= 80) return { variant: "default" as const, text: "Great" };
    if (rate >= 70) return { variant: "secondary" as const, text: "Good" };
    if (rate >= 60) return { variant: "secondary" as const, text: "Fair" };
    return { variant: "destructive" as const, text: "Poor" };
  };

  const winRateBadge = getWinRateBadge(summary.winRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Today's Trading Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.totalTrades}</div>
              <div className="text-sm text-muted-foreground">Total Trades</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getWinRateColor(summary.winRate)}`}>
                {summary.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Target className="h-3 w-3" />
                Win Rate
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {summary.winningTrades}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Wins
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {summary.losingTrades}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Losses
              </div>
            </div>
          </div>

          {/* Win Rate Badge */}
          <div className="flex justify-center">
            <Badge variant={winRateBadge.variant} className="px-4 py-1">
              <Award className="h-3 w-3 mr-1" />
              {winRateBadge.text} Performance
            </Badge>
          </div>

          {/* P&L Breakdown */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Profit & Loss Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Net P&L</div>
                <div className={`text-lg font-semibold ${
                  summary.netPnL > 0 ? 'text-green-500' : 
                  summary.netPnL < 0 ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  {summary.netPnL > 0 ? '+' : ''}${summary.netPnL.toFixed(2)}
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Total Profit</div>
                <div className="text-lg font-semibold text-green-500">
                  +${summary.totalProfit.toFixed(2)}
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Total Loss</div>
                <div className="text-lg font-semibold text-red-500">
                  ${summary.totalLoss.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Trade Performance */}
          {summary.totalTrades > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Trade Performance</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Largest Win</div>
                  <div className="font-medium text-green-500">
                    +${summary.largestWin.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Largest Loss</div>
                  <div className="font-medium text-red-500">
                    ${summary.largestLoss.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Average Win</div>
                  <div className="font-medium text-green-500">
                    +${summary.averageWin.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Average Loss</div>
                  <div className="font-medium text-red-500">
                    ${summary.averageLoss.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {summary.totalTrades === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No trades executed today. Victoria AI is analyzing market conditions.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}