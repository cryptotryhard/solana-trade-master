import { Bot, Circle } from 'lucide-react';
import { WalletConnection } from './wallet-connection';

interface HeaderProps {
  walletConnected: boolean;
  walletAddress?: string;
  walletBalance?: number;
  onWalletConnect: (connected: boolean, address?: string, balance?: number) => void;
}

export function Header({ onWalletConnect }: HeaderProps) {
  const handleWalletChange = (address: string | null, balance: number) => {
    onWalletConnect(!!address, address || undefined, balance);
  };

  return (
    <header className="glass-effect border-b border-accent/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-success flex items-center justify-center">
              <Bot className="text-primary text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">VICTORIA</h1>
              <p className="text-xs text-muted-foreground">AI Trading Bot</p>
            </div>
          </div>

          {/* Network Status & Wallet */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-sm">
              <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
              <span className="text-muted-foreground">Solana Mainnet</span>
            </div>
            
            <WalletConnection onWalletChange={handleWalletChange} />
          </div>
        </div>
      </div>
    </header>
  );
}
