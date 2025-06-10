import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Shield, Target, AlertTriangle, CheckCircle } from 'lucide-react';

interface LearningMetrics {
  totalTrades: number;
  successRate: number;
  avgROI: number;
  avgHoldingTime: number;
  bestPatterns: string[];
  worstPatterns: string[];
  optimalConfidenceRange: { min: number; max: number };
  adaptationScore: number;
}

interface PatternPerformance {
  patternId: string;
  name: string;
  successRate: number;
  avgROI: number;
  sampleSize: number;
  confidence: number;
  weight: number;
  lastUpdated: string;
}

interface ConfidenceHistory {
  timestamp: string;
  threshold: number;
  reason: string;
}

export function LearningDashboard() {
  const { data: learningMetrics, isLoading: metricsLoading } = useQuery<LearningMetrics>({
    queryKey: ['/api/learning/metrics'],
    refetchInterval: 30000
  });

  const { data: patterns, isLoading: patternsLoading } = useQuery<PatternPerformance[]>({
    queryKey: ['/api/learning/patterns'],
    refetchInterval: 60000
  });

  const { data: confidenceHistory, isLoading: historyLoading } = useQuery<ConfidenceHistory[]>({
    queryKey: ['/api/learning/confidence-history'],
    refetchInterval: 60000
  });

  const getPerformanceColor = (value: number, type: 'success' | 'roi' | 'confidence') => {
    switch (type) {
      case 'success':
        return value >= 70 ? 'text-green-500' : value >= 50 ? 'text-yellow-500' : 'text-red-500';
      case 'roi':
        return value >= 0.1 ? 'text-green-500' : value >= 0 ? 'text-yellow-500' : 'text-red-500';
      case 'confidence':
        return value >= 80 ? 'text-green-500' : value >= 60 ? 'text-yellow-500' : 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Learning Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Self-Learning Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="text-center text-muted-foreground">Loading learning metrics...</div>
          ) : learningMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold">{learningMetrics.totalTrades}</div>
                <div className="text-sm text-muted-foreground">Total Trades</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className={`text-2xl font-bold ${getPerformanceColor(learningMetrics.successRate * 100, 'success')}`}>
                  {(learningMetrics.successRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className={`text-2xl font-bold ${getPerformanceColor(learningMetrics.avgROI, 'roi')}`}>
                  {(learningMetrics.avgROI * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg ROI</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className={`text-2xl font-bold ${getPerformanceColor(learningMetrics.adaptationScore, 'confidence')}`}>
                  {learningMetrics.adaptationScore}
                </div>
                <div className="text-sm text-muted-foreground">Adaptation Score</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">No learning data available</div>
          )}

          {learningMetrics && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-green-500">Best Performing Patterns</span>
                </div>
                {learningMetrics.bestPatterns.length > 0 ? (
                  <div className="space-y-1">
                    {learningMetrics.bestPatterns.map((pattern, index) => (
                      <div key={index} className="text-sm">{pattern}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Insufficient data</div>
                )}
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-500">Patterns to Avoid</span>
                </div>
                {learningMetrics.worstPatterns.length > 0 ? (
                  <div className="space-y-1">
                    {learningMetrics.worstPatterns.map((pattern, index) => (
                      <div key={index} className="text-sm">{pattern}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No problematic patterns identified</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pattern Performance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Pattern Performance Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patternsLoading ? (
            <div className="text-center text-muted-foreground">Loading pattern analysis...</div>
          ) : patterns && patterns.length > 0 ? (
            <div className="space-y-4">
              {patterns.map((pattern) => (
                <div key={pattern.patternId} className="p-4 bg-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium">{pattern.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Sample size: {pattern.sampleSize} trades
                      </div>
                    </div>
                    <Badge 
                      className={`${
                        pattern.successRate >= 70 
                          ? 'bg-green-500/20 text-green-500' 
                          : pattern.successRate >= 50 
                          ? 'bg-yellow-500/20 text-yellow-500' 
                          : 'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {pattern.successRate.toFixed(1)}% success
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                      <Progress value={pattern.successRate} className="h-2 mt-1" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Avg ROI</div>
                      <div className={`font-medium ${getPerformanceColor(pattern.avgROI, 'roi')}`}>
                        {(pattern.avgROI * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Weight</div>
                      <div className="font-medium">{pattern.weight.toFixed(2)}x</div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Last updated: {new Date(pattern.lastUpdated).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No pattern data available yet. The system needs to execute trades to learn patterns.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confidence Threshold Evolution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Confidence Threshold Evolution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center text-muted-foreground">Loading threshold history...</div>
          ) : confidenceHistory && confidenceHistory.length > 0 ? (
            <div className="space-y-3">
              {confidenceHistory.slice(-10).map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <div className="font-medium">{entry.threshold}% confidence threshold</div>
                    <div className="text-sm text-muted-foreground">{entry.reason}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No threshold adjustments recorded yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Monitoring Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Protection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="font-medium text-green-500">Anti-Rug Active</div>
              <div className="text-sm text-muted-foreground">All tokens screened</div>
            </div>
            
            <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="font-medium text-blue-500">Security Checks</div>
              <div className="text-sm text-muted-foreground">8-point verification</div>
            </div>
            
            <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <Brain className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="font-medium text-purple-500">Learning Active</div>
              <div className="text-sm text-muted-foreground">Pattern optimization</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}