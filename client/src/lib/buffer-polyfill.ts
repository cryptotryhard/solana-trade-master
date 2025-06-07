import { Buffer } from 'buffer';

// Polyfill Buffer for browser compatibility with Solana Web3.js
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  (globalThis as any).Buffer = Buffer;
}

export { Buffer };