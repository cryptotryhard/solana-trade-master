import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { PortfolioSidebar } from '@/components/portfolio-sidebar';
import { MainDashboard } from '@/components/main-dashboard';
import { ActivityPanel } from '@/components/activity-panel';
import { useWebSocket } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import type { WebSocketMessage } from '@/types/trading';

export default function Dashboard() {
  const [walletConnected, setWalletConnected] = useState(false);
  const { toast } = useToast();

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'NEW_TRADE':
        // Invalidate trades queries to refetch data
        queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
        toast({
          title: "New Trade Executed",
          description: `${message.data.side.toUpperCase()} ${message.data.symbol} - $${parseFloat(message.data.pnl || '0').toFixed(2)}`,
        });
        break;
      case 'NEW_RECOMMENDATION':
        // Invalidate recommendations queries
        queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
        toast({
          title: "New AI Recommendation",
          description: `${message.data.action.toUpperCase()} ${message.data.symbol} - ${message.data.confidence}% confidence`,
        });
        break;
      default:
        break;
    }
  };

  const { isConnected } = useWebSocket(handleWebSocketMessage);

  useEffect(() => {
    document.title = "CryptoAI - Autonomous Solana Trading Bot";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card">
      <Header 
        walletConnected={walletConnected} 
        onWalletConnect={setWalletConnected} 
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="trading-grid">
          <PortfolioSidebar userId={1} />
          <MainDashboard />
          <ActivityPanel />
        </div>
      </main>
      
      {/* Connection Status Indicator */}
      {!isConnected && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
          Disconnected from server
        </div>
      )}
    </div>
  );
}
