import { useState, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Search, User } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import CryptoTicker from "@/components/dashboard/CryptoTicker";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useCurrency } from "@/hooks/useCurrency";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/PageTransition";
// Lazy load heavy chart components to reduce initial bundle
const PriceChart = lazy(() => import("@/components/dashboard/PriceChart"));
const VolumeChart = lazy(() => import("@/components/dashboard/VolumeChart"));
const AIMetrics = lazy(() => import("@/components/dashboard/AIMetrics"));
const AIAnalyzer = lazy(() => import("@/components/dashboard/AIAnalyzer"));
const Top100CryptoList = lazy(() => import("@/components/dashboard/Top100CryptoList"));

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

const Dashboard = () => {
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [userName, setUserName] = useState<string | null>(null);
  const { prices, loading, getPriceBySymbol } = useCryptoPrices();
  const { t } = useTranslation();
  const { formatPrice, symbol: currencySymbol } = useCurrency();

  useEffect(() => {
    const session = localStorage.getItem("wallet_session");
    if (session) {
      const parsed = JSON.parse(session);
      setUserName(parsed.name || null);
    }
  }, []);

  const cryptoData: Record<string, { name: string; price: number; change: number }> = {
    BTC: { name: "Bitcoin", price: getPriceBySymbol("BTC")?.current_price || 86512, change: getPriceBySymbol("BTC")?.price_change_percentage_24h || -4.87 },
    ETH: { name: "Ethereum", price: getPriceBySymbol("ETH")?.current_price || 2842, change: getPriceBySymbol("ETH")?.price_change_percentage_24h || -5.46 },
    SOL: { name: "Solana", price: getPriceBySymbol("SOL")?.current_price || 127.18, change: getPriceBySymbol("SOL")?.price_change_percentage_24h || -6.85 },
    XRP: { name: "Ripple", price: getPriceBySymbol("XRP")?.current_price || 2.05, change: getPriceBySymbol("XRP")?.price_change_percentage_24h || -6.63 },
    DOGE: { name: "Dogecoin", price: getPriceBySymbol("DOGE")?.current_price || 0.1376, change: getPriceBySymbol("DOGE")?.price_change_percentage_24h || -7.84 },
  };

  // Get selected crypto from prices or fallback
  const liveData = getPriceBySymbol(selectedCrypto);
  const selected = liveData 
    ? { name: liveData.name, price: liveData.current_price, change: liveData.price_change_percentage_24h }
    : cryptoData[selectedCrypto] || { name: selectedCrypto, price: 0, change: 0 };

  return (
    <PageTransition>
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
          <CryptoTicker selected={selectedCrypto} onSelect={setSelectedCrypto} getPriceBySymbol={getPriceBySymbol} loading={loading} />

          {/* Time Filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:gap-2 custom-scrollbar">
            {["1s", "5s", "1m", "5m", "15m", "1h"].map((time) => (
              <button
                key={time}
                className={`rounded-lg px-2.5 py-1 text-xs whitespace-nowrap transition-all sm:px-3 sm:text-sm ${
                  time === "1m"
                    ? "bg-primary text-primary-foreground glow-cyan"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {time}
              </button>
            ))}
          </div>

          {/* Selected Crypto Info */}
          <div className="rounded-xl border border-border bg-card glass-card p-4 sm:rounded-2xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20 text-warning font-bold text-sm sm:h-12 sm:w-12 sm:text-base">
                  {selectedCrypto.slice(0, 1)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground sm:text-lg md:text-xl">{selected.name}</h2>
                  <span className="text-xs text-muted-foreground sm:text-sm">{selectedCrypto}/USD</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${loading ? "bg-warning" : "bg-success"} animate-pulse`} />
                <span className="text-xs text-muted-foreground sm:text-sm">{loading ? t("common.loading") : t("common.live")}</span>
              </div>
            </div>

            <div className="mt-4 sm:mt-6">
              <div className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl gradient-text">
                {formatPrice(selected.price)}
              </div>
              <div className="mt-1.5 flex items-center gap-2 sm:mt-2">
                <span className={`text-sm font-medium sm:text-base ${selected.change >= 0 ? "text-success" : "text-destructive"}`}>
                  {selected.change >= 0 ? "↗" : "↘"} {Math.abs(selected.change).toFixed(2)}%
                </span>
                <span className="text-xs text-muted-foreground sm:text-sm">{t("dashboard.change24h")}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-lg bg-secondary/50 p-2.5 sm:bg-transparent sm:p-0">
                <div className="text-[10px] text-muted-foreground sm:text-xs md:text-sm">{t("dashboard.high24h")}</div>
                <div className="font-semibold text-foreground text-xs sm:text-sm md:text-base">{liveData?.high_24h ? formatPrice(liveData.high_24h) : "---"}</div>
              </div>
              <div className="rounded-lg bg-secondary/50 p-2.5 sm:bg-transparent sm:p-0">
                <div className="text-[10px] text-muted-foreground sm:text-xs md:text-sm">{t("dashboard.low24h")}</div>
                <div className="font-semibold text-foreground text-xs sm:text-sm md:text-base">{liveData?.low_24h ? formatPrice(liveData.low_24h) : "---"}</div>
              </div>
              <div className="rounded-lg bg-secondary/50 p-2.5 sm:bg-transparent sm:p-0">
                <div className="text-[10px] text-muted-foreground sm:text-xs md:text-sm">{t("dashboard.volume24h")}</div>
                <div className="font-semibold text-foreground text-xs sm:text-sm md:text-base">{currencySymbol}{liveData?.total_volume ? (liveData.total_volume / 1e9).toFixed(2) + "B" : "---"}</div>
              </div>
              <div className="rounded-lg bg-secondary/50 p-2.5 sm:bg-transparent sm:p-0">
                <div className="text-[10px] text-muted-foreground sm:text-xs md:text-sm">{t("dashboard.marketCap")}</div>
                <div className="font-semibold text-foreground text-xs sm:text-sm md:text-base">{currencySymbol}{liveData?.market_cap ? (liveData.market_cap / 1e9).toFixed(2) + "B" : "---"}</div>
              </div>
            </div>
          </div>

          {/* AI Analyzer */}
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

          {/* Charts Grid */}
          <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              <Suspense fallback={<ChartSkeleton />}>
                <PriceChart crypto={selectedCrypto} coinGeckoId={liveData?.id} />
              </Suspense>
              <Suspense fallback={<ChartSkeleton />}>
                <VolumeChart crypto={selectedCrypto} coinGeckoId={liveData?.id} />
              </Suspense>
            </div>
            <div className="space-y-4 md:space-y-6">
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
            </div>
          </div>

          {/* Top 100 Crypto List */}
          <Suspense fallback={<ChartSkeleton />}>
            <Top100CryptoList selected={selectedCrypto} onSelect={setSelectedCrypto} />
          </Suspense>
        </div>
      </main>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
