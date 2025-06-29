import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, ExternalLink, AlertCircle } from "lucide-react";
import "@/lib/buffer-polyfill";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import "@/types/wallet";

interface WalletConnectionProps {
  onWalletChange?: (address: string | null, balance: number) => void;
}

export function WalletConnection({ onWalletChange }: WalletConnectionProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Solana connection
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

  useEffect(() => {
    // Check if Phantom is already connected on page load
    checkIfWalletConnected();
  }, []);

  const checkIfWalletConnected = async () => {
    try {
      if (window.solana && window.solana.isPhantom) {
        const response = await window.solana.connect({ onlyIfTrusted: true });
        if (response.publicKey) {
          const address = response.publicKey.toString();
          setWalletAddress(address);
          await fetchWalletBalance(address);
        }
      }
    } catch (error) {
      console.log("Wallet not connected or user rejected auto-connect");
    }
  };

  const connectWallet = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      setError("Phantom wallet not found. Please install Phantom extension.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await window.solana.connect();
      const address = response.publicKey.toString();
      setWalletAddress(address);
      await fetchWalletBalance(address);
      
      if (onWalletChange) {
        onWalletChange(address, walletBalance);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setError("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchWalletBalance = async (address: string) => {
    try {
      console.log("Fetching balance for address:", address);
      const publicKey = new PublicKey(address);
      
      // Try server-side proxy first for better reliability
      try {
        console.log("Trying server proxy for balance fetch");
        const response = await fetch(`/api/wallet/balance/${address}`);
        if (response.ok) {
          const data = await response.json();
          const solBalance = data.solBalance;
          console.log("Got balance from server proxy:", solBalance);
          setWalletBalance(solBalance);
          if (onWalletChange) {
            onWalletChange(address, solBalance);
          }
          return;
        }
      } catch (proxyError) {
        console.warn("Server proxy failed, trying direct RPC:", proxyError);
      }
      
      // Enhanced RPC endpoints with better configuration
      const rpcEndpoints = [
        { url: "https://api.mainnet-beta.solana.com", timeout: 10000 },
        { url: "https://solana-mainnet.rpc.extrnode.com", timeout: 10000 },
        { url: "https://rpc.ankr.com/solana", timeout: 10000 },
        { url: "https://solana.public-rpc.com", timeout: 10000 },
        { url: "https://api.mainnet-beta.solana.com", timeout: 15000 }
      ];
      
      let balance = 0;
      let success = false;
      
      for (const endpoint of rpcEndpoints) {
        try {
          console.log(`Trying RPC endpoint: ${endpoint.url}`);
          
          // Create connection with timeout
          const conn = new Connection(endpoint.url, {
            commitment: "confirmed",
            confirmTransactionInitialTimeout: endpoint.timeout,
            disableRetryOnRateLimit: true
          });
          
          // Race condition with timeout
          const balancePromise = conn.getBalance(publicKey);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), endpoint.timeout)
          );
          
          balance = await Promise.race([balancePromise, timeoutPromise]) as number;
          success = true;
          console.log(`Successfully fetched balance from ${endpoint.url}:`, balance, "lamports");
          break;
        } catch (rpcError) {
          console.warn(`Failed to fetch from ${endpoint.url}:`, rpcError);
          continue;
        }
      }
      
      if (!success) {
        throw new Error("All RPC endpoints failed to fetch balance");
      }
      
      const solBalance = balance / LAMPORTS_PER_SOL;
      console.log("Final SOL Balance:", solBalance);
      setWalletBalance(solBalance);
      
      if (onWalletChange) {
        onWalletChange(address, solBalance);
      }
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      setError("Failed to fetch wallet balance. Network connectivity issue.");
      setWalletBalance(0);
      if (onWalletChange) {
        onWalletChange(address, 0);
      }
    }
  };

  const disconnectWallet = async () => {
    try {
      if (window.solana) {
        await window.solana.disconnect();
      }
      setWalletAddress(null);
      setWalletBalance(0);
      setError(null);
      
      if (onWalletChange) {
        onWalletChange(null, 0);
      }
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: number) => {
    return balance.toFixed(3);
  };

  if (!walletAddress) {
    return (
      <div className="flex items-center gap-3">
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="p-2">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}
        <Button 
          onClick={connectWallet} 
          disabled={isConnecting}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2"
        >
          <Wallet className="h-4 w-4 mr-2" />
          {isConnecting ? "Connecting..." : "Connect Phantom"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div className="text-sm">
                <div className="font-medium text-green-700 dark:text-green-300">
                  {formatAddress(walletAddress)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  {formatBalance(walletBalance)} SOL
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-green-700 border-green-300">
              Connected
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => fetchWalletBalance(walletAddress)}
        >
          Refresh
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.open(`https://solscan.io/account/${walletAddress}`, '_blank')}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={disconnectWallet}
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}