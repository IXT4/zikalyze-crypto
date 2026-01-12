import { useState, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Search, User, Bell } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import CryptoTicker from "@/components/dashboard/CryptoTicker";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useWebSocketAlerts } from "@/hooks/useWebSocketAlerts";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ErrorBoundary, { ChartErrorFallback, MinimalErrorFallback } from "@/components/ErrorBoundary";

// Lazy load heavy components to reduce initial bundle
const GPUHeatmap = lazy(() => import("@/components/dashboard/GPUHeatmap"));
const AIMetrics = lazy(() => import("@/components/dashboard/AIMetrics"));
const AIAnalyzer = lazy(() => import("@/components/dashboard/AIAnalyzer"));
const Top100CryptoList = lazy(() => import("@/components/dashboard/Top100CryptoList"));
const OnChainMetrics = lazy(() => import("@/components/dashboard/OnChainMetrics"));
const OracleCrossValidation = lazy(() => import("@/components/dashboard/OracleCrossValidation"));

// Skeleton loaders for lazy components
const ChartSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-4 sm:rounded-2xl sm:p-6">
    <Skeleton className="h-5 w-24 mb-3 sm:h-6 sm:w-32 sm:mb-4" />
    <Skeleton className="h-[200px] w-full sm:h-[300px]" />
  </div>
);

const MetricsSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3 sm:rounded-2xl sm:p-6 sm:space-y-4">
    <Skeleton className="h-5 w-20 sm:h-6 sm:w-24" />
    <Skeleton className="h-16 w-full sm:h-20" />
    <Skeleton className="h-16 w-full sm:h-20" />
  </div>
);

const LAST_CRYPTO_KEY = "zikalyze_last_crypto";

const Dashboard = () => {
  // Restore last viewed crypto from localStorage, default to BTC
  const [selectedCrypto, setSelectedCrypto] = useState(() => {
    try {
      return localStorage.getItem(LAST_CRYPTO_KEY) || "BTC";
    } catch {
      return "BTC";
    }
  });
  const [userName, setUserName] = useState<string | null>(null);
  const { prices, loading, getPriceBySymbol, oracleStatus, isLive, connectedExchanges } = useCryptoPrices();
  const { t } = useTranslation();
  
  // WebSocket-based price alert monitoring
  const wsAlerts = useWebSocketAlerts([selectedCrypto, "BTC", "ETH", "SOL"]);

  // Save selected crypto to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LAST_CRYPTO_KEY, selectedCrypto);
    } catch (error) {
      console.error("Error saving last crypto:", error);
    }
  }, [selectedCrypto]);

  useEffect(() => {
    const session = localStorage.getItem("wallet_session");
    if (session) {
      const parsed = JSON.parse(session);
      setUserName(parsed.name || null);
    }
  }, []);

  // Get selected crypto from live prices
  const liveData = getPriceBySymbol(selectedCrypto);
  const selected = liveData 
    ? { 
        name: liveData.name, 
        price: liveData.current_price, 
        change: liveData.price_change_percentage_24h,
        high24h: liveData.high_24h,
        low24h: liveData.low_24h,
        volume: liveData.total_volume,
        marketCap: liveData.market_cap
      }
    : { name: selectedCrypto, price: 0, change: 0, high24h: 0, low24h: 0, volume: 0, marketCap: 0 };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background texture-noise custom-scrollbar">
      <Sidebar />

      <main className="ml-16 lg:ml-64 safe-area-inset-bottom">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-3 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-foreground sm:text-xl md:text-2xl">{t("dashboard.title")}</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("dashboard.searchPlaceholder")}
                className="w-48 lg:w-64 bg-secondary border-border pl-10"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* WebSocket Alert Status */}
              {wsAlerts.alertCount > 0 && (
                <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-400">
                  <Bell className="h-3 w-3" />
                  <span>{wsAlerts.alertCount} alerts</span>
                </Badge>
              )}
              {userName && (
                <span className="text-xs font-medium text-foreground hidden sm:block sm:text-sm">
                  {userName}
                </span>
              )}
              <Button variant="ghost" size="icon" className="rounded-full bg-secondary h-8 w-8 sm:h-10 sm:w-10">
                <User className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-3 space-y-4 sm:p-4 md:p-6 md:space-y-6">
          {/* Crypto Ticker */}
          <CryptoTicker 
            selected={selectedCrypto} 
            onSelect={setSelectedCrypto} 
            getPriceBySymbol={getPriceBySymbol} 
            loading={loading}
            oracleStatus={oracleStatus}
            isLive={isLive}
            connectedExchanges={connectedExchanges}
          />

          {/* Live On-Chain Data */}
          <ErrorBoundary componentName="On-Chain Metrics" fallback={<MinimalErrorFallback />}>
            <Suspense fallback={<MetricsSkeleton />}>
              <OnChainMetrics
                crypto={selectedCrypto}
                price={selected.price}
                change={selected.change}
                volume={liveData?.total_volume}
                marketCap={liveData?.market_cap}
                coinGeckoId={liveData?.id}
              />
            </Suspense>
          </ErrorBoundary>

          {/* AI Analyzer */}
          <ErrorBoundary componentName="AI Analyzer" fallback={<ChartErrorFallback />}>
            <Suspense fallback={<ChartSkeleton />}>
              <AIAnalyzer 
                crypto={selectedCrypto} 
                price={selected.price} 
                change={selected.change}
                high24h={liveData?.high_24h}
                low24h={liveData?.low_24h}
                volume={liveData?.total_volume}
                marketCap={liveData?.market_cap}
              />
            </Suspense>
          </ErrorBoundary>

          {/* Metrics Grid */}
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <ErrorBoundary componentName="AI Metrics" fallback={<MinimalErrorFallback />}>
              <Suspense fallback={<MetricsSkeleton />}>
                <AIMetrics 
                  price={selected.price}
                  change={selected.change}
                  high24h={liveData?.high_24h}
                  low24h={liveData?.low_24h}
                  volume={liveData?.total_volume}
                  marketCap={liveData?.market_cap}
                />
              </Suspense>
            </ErrorBoundary>
            <ErrorBoundary componentName="Oracle Cross-Validation" fallback={<MinimalErrorFallback />}>
              <Suspense fallback={<MetricsSkeleton />}>
                <OracleCrossValidation crypto={selectedCrypto} />
              </Suspense>
            </ErrorBoundary>
          </div>

          {/* GPU Market Heatmap */}
          <ErrorBoundary componentName="Market Heatmap" fallback={<ChartErrorFallback />}>
            <Suspense fallback={<ChartSkeleton />}>
              <GPUHeatmap prices={prices} loading={loading} onSelectCrypto={setSelectedCrypto} />
            </Suspense>
          </ErrorBoundary>

          {/* Top 100 Crypto List */}
          <ErrorBoundary componentName="Crypto List" fallback={<ChartErrorFallback />}>
            <Suspense fallback={<ChartSkeleton />}>
              <Top100CryptoList selected={selectedCrypto} onSelect={setSelectedCrypto} prices={prices} loading={loading} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
