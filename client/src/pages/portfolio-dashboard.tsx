import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PortfolioData {
  totalValueUSD: number;
  lastUpdated: number;
  tokens: {
    mint: string;
    symbol: string;
    balance: number;
    valueUSD: number;
  }[];
}

export default function PortfolioDashboard() {
  const { data: portfolio, isLoading } = useQuery<PortfolioData>({
    queryKey: ['/api/portfolio/real-value'],
    refetchInterval: 30000, // Update every 30 seconds
  });

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Fetching authentic wallet data...</p>
        </div>
      </div>
    );
  }

  // Handle API errors with clear messaging
  if (!portfolio) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-600">
              Portfolio Service Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Unable to fetch authentic portfolio data. This could be due to network issues or API limitations.
            </p>
            <p className="text-sm text-gray-500">
              Wallet: 9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            📊 Portfolio Value
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl font-bold text-green-600 mb-4">
            ${portfolio?.totalValueUSD?.toFixed(2) || '0.00'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Updated {portfolio?.lastUpdated ? formatTime(portfolio.lastUpdated) : '--:--'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}