import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WalletModal } from './wallet-modal';
import { Bot, Wallet, Circle } from 'lucide-react';

interface HeaderProps {
  walletConnected: boolean;
  walletAddress?: string;
  walletBalance?: number;
  onWalletConnect: (connected: boolean, address?: string, balance?: number) => void;
}

export function Header({ walletConnected, walletAddress, walletBalance, onWalletConnect }: HeaderProps) {
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleWalletClick = () => {
    if (walletConnected) {
      onWalletConnect(false);
    } else {
      setShowWalletModal(true);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <>
      <header className="glass-effect border-b border-accent/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-success flex items-center justify-center">
                <Bot className="text-primary text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">CryptoAI</h1>
                <p className="text-xs text-muted-foreground">Autonomous Trading</p>
              </div>
            </div>

            {/* Network Status & Wallet */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm">
                <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
                <span className="text-muted-foreground">Solana Mainnet</span>
              </div>
              
              <Button
                onClick={handleWalletClick}
                className={`${
                  walletConnected
                    ? 'bg-gradient-to-r from-green-500 to-accent hover:from-green-500/80 hover:to-accent/80'
                    : 'bg-gradient-to-r from-accent to-green-500 hover:from-accent/80 hover:to-green-500/80'
                } text-primary font-semibold neon-border transition-all duration-300`}
              >
                <Wallet className="mr-2 h-4 w-4" />
                {walletConnected ? (
                  <div className="flex flex-col items-start">
                    <span className="text-xs">{walletAddress ? formatAddress(walletAddress) : 'Connected'}</span>
                    <span className="text-xs opacity-75">{walletBalance?.toFixed(2)} SOL</span>
                  </div>
                ) : 'Connect Phantom'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={(connected) => {
          onWalletConnect(connected);
          setShowWalletModal(false);
        }}
      />
    </>
  );
}
