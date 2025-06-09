export interface PhantomWallet {
  isPhantom: boolean;
  publicKey: {
    toString(): string;
  };
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
}

declare global {
  interface Window {
    solana?: PhantomWallet;
  }
}