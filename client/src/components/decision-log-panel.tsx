import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DecisionLogEntry {
  id: string;
  timestamp: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold' | 'skip';
  confidence: number;
  reasoning: string;
  price: number;
  signals: string[];
  outcome?: 'executed' | 'rejected' | 'deferred';
}

interface QueuedToken {
  symbol: string;
  mintAddress: string;
  confidence: number;
  signals: string[];
  queuePosition: number;
  estimatedExecution: string;
  reasoning: string;
}

export function DecisionLogPanel() {
  const { data: decisions = [] } = useQuery({
    queryKey: ['/api/bot/decisions'],
    refetchInterval: 2000
  });

  const { data: queue = [] } = useQuery({
    queryKey: ['/api/bot/queue-analysis'],
    refetchInterval: 1000
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'sell': return <TrendingDown className="w-4 h-4 text-red-400" />;
      case 'hold': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'skip': return <XCircle className="w-4 h-4 text-gray-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    }
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'executed': return 'bg-green-500/20 text-green-300';
      case 'rejected': return 'bg-red-500/20 text-red-300';
      case 'deferred': return 'bg-yellow-500/20 text-yellow-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">VICTORIA Decision Intelligence</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="queue" className="text-white">
              Trading Queue ({queue.length})
            </TabsTrigger>
            <TabsTrigger value="log" className="text-white">
              Decision Log ({decisions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {queue.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No tokens in queue. VICTORIA is scanning...
                  </div>
                ) : (
                  queue.map((token: QueuedToken, index: number) => (
                    <div key={token.mintAddress} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            #{token.queuePosition}
                          </Badge>
                          <span className="text-white font-semibold">{token.symbol}</span>
                          <span className={`font-bold ${getConfidenceColor(token.confidence)}`}>
                            {token.confidence}%
                          </span>
                        </div>
                        <span className="text-gray-400 text-sm">{token.estimatedExecution}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {token.signals.map((signal, i) => (
                          <Badge key={i} variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                      
                      <p className="text-gray-300 text-sm">{token.reasoning}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="log" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {decisions.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No decisions recorded yet
                  </div>
                ) : (
                  decisions.map((decision: DecisionLogEntry) => (
                    <div key={decision.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getActionIcon(decision.action)}
                          <span className="text-white font-semibold">{decision.symbol}</span>
                          <Badge className={getOutcomeColor(decision.outcome)}>
                            {decision.outcome || 'pending'}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${getConfidenceColor(decision.confidence)}`}>
                            {decision.confidence}%
                          </div>
                          <div className="text-gray-400 text-sm">
                            ${decision.price.toFixed(6)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {decision.signals.map((signal, i) => (
                          <Badge key={i} variant="secondary" className="text-xs bg-blue-500/20 text-blue-300">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-2">{decision.reasoning}</p>
                      
                      <div className="text-gray-500 text-xs">
                        {new Date(decision.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}