import { Buffer } from 'buffer';

// Polyfill Buffer for browser compatibility with Solana Web3.js
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
  (globalThis as any).Buffer = Buffer;
  (globalThis as any).global = window;
}

export { Buffer };