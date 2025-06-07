import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wallet, Smartphone, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { phantomWallet } from '@/lib/phantom-wallet';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (connected: boolean, address?: string, balance?: number) => void;
}

export function WalletModal({ open, onClose, onConnect }: WalletModalProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  const handlePhantomConnect = async () => {
    setConnecting(true);
    setError('');
    
    try {
      const walletExists = await phantomWallet.checkIfWalletExists();
      
      if (!walletExists) {
        setError('Phantom wallet not found. Please install the Phantom browser extension.');
        setConnecting(false);
        return;
      }

      const connection = await phantomWallet.connectWallet();
      
      if (connection) {
        // Update backend with wallet info
        await apiRequest('POST', '/api/wallet/connect', {
          userId: 1,
          walletAddress: connection.publicKey,
          balance: connection.balance
        });

        toast({
          title: "Wallet Connected",
          description: `Connected to ${connection.publicKey.slice(0, 8)}...${connection.publicKey.slice(-4)}`,
        });

        onConnect(true, connection.publicKey, connection.balance);
      } else {
        setError('Failed to connect wallet. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-effect neon-border max-w-md">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-accent to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="text-primary text-2xl" />
          </div>
          <DialogTitle className="text-xl font-bold">Connect Your Wallet</DialogTitle>
          <p className="text-muted-foreground">Connect your Phantom wallet to start autonomous trading</p>
        </DialogHeader>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-500 text-sm">{error}</span>
          </div>
        )}

        <div className="space-y-3 mt-6">
          <Button
            onClick={handlePhantomConnect}
            disabled={connecting}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 transition-all duration-300 disabled:opacity-50"
          >
            <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-600 rounded flex items-center justify-center mr-2">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            {connecting ? 'Connecting...' : 'Phantom Wallet'}
          </Button>
          
          <Button
            variant="secondary"
            disabled={connecting}
            className="w-full bg-secondary hover:bg-secondary/80 text-white font-semibold py-3 transition-all duration-300 disabled:opacity-50"
          >
            <Smartphone className="mr-2 h-4 w-4 text-accent" />
            WalletConnect (Coming Soon)
          </Button>
        </div>
        
        <Button
          variant="ghost"
          onClick={onClose}
          className="mt-4 text-muted-foreground hover:text-white text-sm"
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
