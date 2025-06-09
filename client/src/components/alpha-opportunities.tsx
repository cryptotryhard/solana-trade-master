import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  Users, 
  DollarSign, 
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity
} from "lucide-react";
import { useState } from "react";

interface AlphaToken {
  symbol: string;
  mintAddress: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  age: string;
  riskLevel: string;
  pumpScore?: number;
  pumpReadiness?: 'low' | 'medium' | 'high' | 'critical';
  sentimentScore?: number;
}

interface PrePumpScore {
  symbol: string;
  maturityScore: number;
  pumpReadiness: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  expectedPumpWindow: string;
  riskLevel: 'safe' | 'moderate' | 'high' | 'extreme';
  factors: {
    ageScore: number;
    liquidityScore: number;
    holderScore: number;
    accelerationScore: number;
    whaleScore: number;
    momentumScore: number;
  };
}

export function AlphaOpportunities() {
  const [highReadinessOnly, setHighReadinessOnly] = useState(false);
  const [showPrePumpScores, setShowPrePumpScores] = useState(true);

  const { data: alphaTokens, isLoading } = useQuery({
    queryKey: ['/api/alpha/tokens'],
    refetchInterval: 5000,
  });

  const { data: highReadinessTokens } = useQuery({
    queryKey: ['/api/prepump/high-readiness'],
    refetchInterval: 10000,
    enabled: showPrePumpScores,
  });

  const tokensToShow = highReadinessOnly ? 
    (Array.isArray(alphaTokens) ? alphaTokens.filter((token: AlphaToken) => {
      const score = Array.isArray(highReadinessTokens) ? 
        highReadinessTokens.find((s: PrePumpScore) => s.symbol === token.symbol) : undefined;
      return score && (score.pumpReadiness === 'high' || score.pumpReadiness === 'critical');
    }) : []) : 
    (Array.isArray(alphaTokens) ? alphaTokens : []);

  const getPumpReadinessColor = (readiness: string) => {
    switch (readiness) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-300 text-black';
    }
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'safe': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'extreme': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPrePumpScore = (symbol: string): PrePumpScore | undefined => {
    return highReadinessTokens?.find((s: PrePumpScore) => s.symbol === symbol);
  };

  const analyzeToken = async (symbol: string, mintAddress: string) => {
    try {
      const response = await fetch('/api/prepump/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, mintAddress })
      });
      
      if (response.ok) {
        console.log(`Pre-pump analysis initiated for ${symbol}`);
      }
    } catch (error) {
      console.error('Failed to analyze token:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Alpha Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Alpha Opportunities
            <Badge variant="outline" className="ml-2">
              {tokensToShow.length} tokens
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="pre-pump-scores"
                checked={showPrePumpScores}
                onCheckedChange={setShowPrePumpScores}
              />
              <label htmlFor="pre-pump-scores" className="text-sm font-medium">
                Pre-Pump Scores
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="high-readiness"
                checked={highReadinessOnly}
                onCheckedChange={setHighReadinessOnly}
                disabled={!showPrePumpScores}
              />
              <label htmlFor="high-readiness" className="text-sm font-medium">
                High Pump Readiness Only
              </label>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tokensToShow.map((token: AlphaToken) => {
            const prePumpScore = showPrePumpScores ? getPrePumpScore(token.symbol) : undefined;
            
            return (
              <div 
                key={token.symbol}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{token.symbol}</h3>
                      <Badge variant="outline" className="text-xs">
                        {token.age}
                      </Badge>
                      {prePumpScore && (
                        <Badge className={`text-xs ${getPumpReadinessColor(prePumpScore.pumpReadiness)}`}>
                          {prePumpScore.pumpReadiness.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {token.mintAddress.slice(0, 8)}...{token.mintAddress.slice(-8)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      ${token.price.toFixed(6)}
                    </div>
                    <div className={`text-sm font-semibold ${
                      token.change24h > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {token.change24h > 0 ? '+' : ''}{token.change24h.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Pre-Pump Score Section */}
                {showPrePumpScores && prePumpScore && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-sm">Pre-Pump Maturity Score</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-blue-600">
                          {prePumpScore.maturityScore}
                        </span>
                        <span className="text-sm text-muted-foreground">/100</span>
                      </div>
                    </div>
                    <Progress value={prePumpScore.maturityScore} className="mb-2" />
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-semibold">Pump Window</div>
                        <div className="text-muted-foreground">{prePumpScore.expectedPumpWindow}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Confidence</div>
                        <div className="text-muted-foreground">{prePumpScore.confidence}%</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Risk Level</div>
                        <div className={getRiskLevelColor(prePumpScore.riskLevel)}>
                          {prePumpScore.riskLevel}
                        </div>
                      </div>
                    </div>

                    {/* Factor Breakdown */}
                    <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="flex justify-between">
                            <span>Age</span>
                            <span>{prePumpScore.factors.ageScore.toFixed(0)}</span>
                          </div>
                          <Progress value={prePumpScore.factors.ageScore} className="h-1" />
                        </div>
                        <div>
                          <div className="flex justify-between">
                            <span>Whales</span>
                            <span>{prePumpScore.factors.whaleScore.toFixed(0)}</span>
                          </div>
                          <Progress value={prePumpScore.factors.whaleScore} className="h-1" />
                        </div>
                        <div>
                          <div className="flex justify-between">
                            <span>Volume</span>
                            <span>{prePumpScore.factors.accelerationScore.toFixed(0)}</span>
                          </div>
                          <Progress value={prePumpScore.factors.accelerationScore} className="h-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Token Metrics */}
                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">Volume</span>
                    </div>
                    <div className="text-sm font-semibold">
                      ${(token.volume24h / 1000).toFixed(1)}K
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Activity className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">Liquidity</span>
                    </div>
                    <div className="text-sm font-semibold">
                      ${(token.liquidity / 1000).toFixed(1)}K
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">Holders</span>
                    </div>
                    <div className="text-sm font-semibold">{token.holders}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Target className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">Market Cap</span>
                    </div>
                    <div className="text-sm font-semibold">
                      ${(token.marketCap / 1000).toFixed(1)}K
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getRiskLevelColor(token.riskLevel)}`}
                    >
                      {token.riskLevel} risk
                    </Badge>
                    {prePumpScore?.maturityScore && prePumpScore.maturityScore > 80 && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        High Score
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {showPrePumpScores && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => analyzeToken(token.symbol, token.mintAddress)}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Analyze
                      </Button>
                    )}
                    <Button size="sm">
                      Trade
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {tokensToShow.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {highReadinessOnly 
              ? "No high pump readiness tokens found" 
              : "No alpha opportunities available"
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}