import { useState } from "react";
import { Search, User } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import CryptoTicker from "@/components/dashboard/CryptoTicker";
import PriceChart from "@/components/dashboard/PriceChart";
import VolumeChart from "@/components/dashboard/VolumeChart";
import AIMetrics from "@/components/dashboard/AIMetrics";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import PredictiveChart from "@/components/dashboard/PredictiveChart";
import CandlestickChart from "@/components/dashboard/CandlestickChart";
import DonutChart from "@/components/dashboard/DonutChart";
import SmartMoneyCard from "@/components/dashboard/SmartMoneyCard";
import AIAnalyzer from "@/components/dashboard/AIAnalyzer";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const { prices, loading, getPriceBySymbol } = useCryptoPrices();

  const cryptoData: Record<string, { name: string; price: number; change: number }> = {
    BTC: { name: "Bitcoin", price: getPriceBySymbol("BTC")?.current_price || 86512, change: getPriceBySymbol("BTC")?.price_change_percentage_24h || -4.87 },
    ETH: { name: "Ethereum", price: getPriceBySymbol("ETH")?.current_price || 2842, change: getPriceBySymbol("ETH")?.price_change_percentage_24h || -5.46 },
    SOL: { name: "Solana", price: getPriceBySymbol("SOL")?.current_price || 127.18, change: getPriceBySymbol("SOL")?.price_change_percentage_24h || -6.85 },
    XRP: { name: "Ripple", price: getPriceBySymbol("XRP")?.current_price || 2.05, change: getPriceBySymbol("XRP")?.price_change_percentage_24h || -6.63 },
    DOGE: { name: "Dogecoin", price: getPriceBySymbol("DOGE")?.current_price || 0.1376, change: getPriceBySymbol("DOGE")?.price_change_percentage_24h || -7.84 },
  };

  const selected = cryptoData[selectedCrypto];
  const liveData = getPriceBySymbol(selectedCrypto);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-16 lg:ml-64">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Zikalyze</h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search"
                className="w-64 bg-secondary border-border pl-10"
              />
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Crypto Ticker */}
          <CryptoTicker selected={selectedCrypto} onSelect={setSelectedCrypto} />

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
                  ₿
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
                  <span className="text-sm text-muted-foreground">{selectedCrypto}/USD</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${loading ? "bg-warning" : "bg-success"} animate-pulse`} />
                <span className="text-sm text-muted-foreground">{loading ? "LOADING..." : "LIVE"}</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-4xl font-bold text-foreground">
                ${selected.price.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-destructive">↘ {Math.abs(selected.change)}%</span>
                <span className="text-muted-foreground">24h</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">24h High</div>
                <div className="font-semibold text-foreground">${liveData?.high_24h?.toLocaleString() || "---"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">24h Low</div>
                <div className="font-semibold text-foreground">${liveData?.low_24h?.toLocaleString() || "---"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">24h Volume</div>
                <div className="font-semibold text-foreground">${liveData?.total_volume ? (liveData.total_volume / 1e9).toFixed(2) + "B" : "---"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Market Cap</div>
                <div className="font-semibold text-foreground">${liveData?.market_cap ? (liveData.market_cap / 1e9).toFixed(2) + "B" : "---"}</div>
              </div>
            </div>
          </div>

          {/* AI Analyzer */}
          <AIAnalyzer 
            crypto={selectedCrypto} 
            price={selected.price} 
            change={selected.change} 
          />

          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <PriceChart crypto={selectedCrypto} />
              <VolumeChart />
            </div>
            <div className="space-y-6">
              <AIMetrics />
              <SmartMoneyCard />
            </div>
          </div>

          {/* Analytics Row */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnalyticsChart />
            <PredictiveChart />
            <DonutChart />
          </div>

          {/* Candlestick */}
          <CandlestickChart />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
