import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { PortfolioSidebar } from '@/components/portfolio-sidebar';
import { MainDashboard } from '@/components/main-dashboard-tabbed';
import { LivePortfolioDashboard } from '@/components/live-portfolio-dashboard';
import { ActivityPanel } from '@/components/activity-panel';
import { AdvancedMetricsDashboard } from '@/components/advanced-metrics-dashboard';
import { useWebSocket } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import type { WebSocketMessage } from '@/types/trading';

export default function Dashboard() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>();
  const [walletBalance, setWalletBalance] = useState<number>();
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

  const handleWalletConnect = (connected: boolean, address?: string, balance?: number) => {
    setWalletConnected(connected);
    setWalletAddress(address);
    setWalletBalance(balance);
    
    // Invalidate portfolio queries when wallet changes
    if (connected && address) {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bot/status'] });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card">
      <Header 
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        onWalletConnect={handleWalletConnect} 
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="trading-grid">
          <PortfolioSidebar 
            userId={1} 
            walletAddress={walletAddress}
            walletBalance={walletBalance}
          />
          <div className="space-y-6">
            <MainDashboard />
            <LivePortfolioDashboard />
            <AdvancedMetricsDashboard />
          </div>
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
