import { apiRequest } from './queryClient';
import type { CryptoPrice } from '@/types/trading';

export async function getSolanaPrice(): Promise<CryptoPrice> {
  const response = await apiRequest('GET', '/api/prices/solana');
  return response.json();
}

export async function getTopTokens(): Promise<CryptoPrice[]> {
  const response = await apiRequest('GET', '/api/prices/top-tokens');
  return response.json();
}

export async function getPortfolio(userId: number) {
  const response = await apiRequest('GET', `/api/portfolio/${userId}`);
  return response.json();
}

export async function getRecentTrades() {
  const response = await apiRequest('GET', '/api/trades/recent');
  return response.json();
}

export async function getRecommendations() {
  const response = await apiRequest('GET', '/api/recommendations');
  return response.json();
}
