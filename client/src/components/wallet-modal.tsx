import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wallet, Smartphone } from 'lucide-react';

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (connected: boolean) => void;
}

export function WalletModal({ open, onClose, onConnect }: WalletModalProps) {
  const handlePhantomConnect = () => {
    // Simulate wallet connection
    setTimeout(() => {
      onConnect(true);
    }, 1000);
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
        
        <div className="space-y-3 mt-6">
          <Button
            onClick={handlePhantomConnect}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 transition-all duration-300"
          >
            <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-600 rounded flex items-center justify-center mr-2">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            Phantom Wallet
          </Button>
          
          <Button
            variant="secondary"
            className="w-full bg-secondary hover:bg-secondary/80 text-white font-semibold py-3 transition-all duration-300"
          >
            <Smartphone className="mr-2 h-4 w-4 text-accent" />
            WalletConnect
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
