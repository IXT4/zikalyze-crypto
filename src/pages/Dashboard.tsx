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

// Lazy load heavy chart components to reduce initial bundle
const PriceChart = lazy(() => import("@/components/dashboard/PriceChart"));
const VolumeChart = lazy(() => import("@/components/dashboard/VolumeChart"));
const AIMetrics = lazy(() => import("@/components/dashboard/AIMetrics"));
const AIAnalyzer = lazy(() => import("@/components/dashboard/AIAnalyzer"));
const Top100CryptoList = lazy(() => import("@/components/dashboard/Top100CryptoList"));

// Skeleton loaders for lazy components
const ChartSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-6">
    <Skeleton className="h-6 w-32 mb-4" />
    <Skeleton className="h-[300px] w-full" />
  </div>
);

const MetricsSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
    <Skeleton className="h-6 w-24" />
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-20 w-full" />
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
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-16 lg:ml-64">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("dashboard.searchPlaceholder")}
                className="w-64 bg-secondary border-border pl-10"
              />
            </div>
            <div className="flex items-center gap-3">
              {userName && (
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  {userName}
                </span>
              )}
              <Button variant="ghost" size="icon" className="rounded-full bg-secondary">
                <User className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Crypto Ticker */}
          <CryptoTicker selected={selectedCrypto} onSelect={setSelectedCrypto} getPriceBySymbol={getPriceBySymbol} loading={loading} />

          {/* Time Filter */}
          <div className="flex gap-2">
            {["1s", "5s", "1m", "5m", "15m", "1h"].map((time) => (
              <button
                key={time}
                className={`rounded-lg px-3 py-1 text-sm ${
                  time === "1m"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {time}
              </button>
            ))}
          </div>

          {/* Selected Crypto Info */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20 text-warning font-bold">
                  {selectedCrypto.slice(0, 1)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
                  <span className="text-sm text-muted-foreground">{selectedCrypto}/USD</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${loading ? "bg-warning" : "bg-success"} animate-pulse`} />
                <span className="text-sm text-muted-foreground">{loading ? t("common.loading") : t("common.live")}</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-4xl font-bold text-foreground">
                {formatPrice(selected.price)}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={selected.change >= 0 ? "text-success" : "text-destructive"}>
                  {selected.change >= 0 ? "↗" : "↘"} {Math.abs(selected.change).toFixed(2)}%
                </span>
                <span className="text-muted-foreground">{t("dashboard.change24h")}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">{t("dashboard.high24h")}</div>
                <div className="font-semibold text-foreground">{liveData?.high_24h ? formatPrice(liveData.high_24h) : "---"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("dashboard.low24h")}</div>
                <div className="font-semibold text-foreground">{liveData?.low_24h ? formatPrice(liveData.low_24h) : "---"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("dashboard.volume24h")}</div>
                <div className="font-semibold text-foreground">{currencySymbol}{liveData?.total_volume ? (liveData.total_volume / 1e9).toFixed(2) + "B" : "---"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("dashboard.marketCap")}</div>
                <div className="font-semibold text-foreground">{currencySymbol}{liveData?.market_cap ? (liveData.market_cap / 1e9).toFixed(2) + "B" : "---"}</div>
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
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Suspense fallback={<ChartSkeleton />}>
                <PriceChart crypto={selectedCrypto} coinGeckoId={liveData?.id} />
              </Suspense>
              <Suspense fallback={<ChartSkeleton />}>
                <VolumeChart crypto={selectedCrypto} coinGeckoId={liveData?.id} />
              </Suspense>
            </div>
            <div className="space-y-6">
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
  );
};

export default Dashboard;
