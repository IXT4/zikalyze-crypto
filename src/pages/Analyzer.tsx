import { useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/dashboard/Sidebar";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import AIAnalyzer from "@/components/dashboard/AIAnalyzer";
import CryptoTicker from "@/components/dashboard/CryptoTicker";
import SentimentAnalysis from "@/components/dashboard/SentimentAnalysis";
import OnChainMetrics from "@/components/dashboard/OnChainMetrics";
const Analyzer = () => {
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const { getPriceBySymbol, loading } = useCryptoPrices();
  const { t } = useTranslation();

  const cryptoData: Record<string, { name: string; price: number; change: number }> = {
    BTC: { name: "Bitcoin", price: getPriceBySymbol("BTC")?.current_price || 86512, change: getPriceBySymbol("BTC")?.price_change_percentage_24h || -4.87 },
    ETH: { name: "Ethereum", price: getPriceBySymbol("ETH")?.current_price || 2842, change: getPriceBySymbol("ETH")?.price_change_percentage_24h || -5.46 },
    SOL: { name: "Solana", price: getPriceBySymbol("SOL")?.current_price || 127.18, change: getPriceBySymbol("SOL")?.price_change_percentage_24h || -6.85 },
    XRP: { name: "Ripple", price: getPriceBySymbol("XRP")?.current_price || 2.05, change: getPriceBySymbol("XRP")?.price_change_percentage_24h || -6.63 },
    DOGE: { name: "Dogecoin", price: getPriceBySymbol("DOGE")?.current_price || 0.1376, change: getPriceBySymbol("DOGE")?.price_change_percentage_24h || -7.84 },
    KAS: { name: "Kaspa", price: getPriceBySymbol("KAS")?.current_price || 0.12, change: getPriceBySymbol("KAS")?.price_change_percentage_24h || 2.5 },
    ADA: { name: "Cardano", price: getPriceBySymbol("ADA")?.current_price || 0.45, change: getPriceBySymbol("ADA")?.price_change_percentage_24h || -3.2 },
    AVAX: { name: "Avalanche", price: getPriceBySymbol("AVAX")?.current_price || 28.5, change: getPriceBySymbol("AVAX")?.price_change_percentage_24h || -4.1 },
    LINK: { name: "Chainlink", price: getPriceBySymbol("LINK")?.current_price || 14.2, change: getPriceBySymbol("LINK")?.price_change_percentage_24h || -2.8 },
    DOT: { name: "Polkadot", price: getPriceBySymbol("DOT")?.current_price || 5.8, change: getPriceBySymbol("DOT")?.price_change_percentage_24h || -3.5 },
  };

  const selected = cryptoData[selectedCrypto];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-16 lg:ml-64">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">{t("analyzer.title")}</h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("common.search")}
                className="w-64 bg-secondary border-border pl-10"
              />
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Crypto Selection */}
          <CryptoTicker selected={selectedCrypto} onSelect={setSelectedCrypto} getPriceBySymbol={getPriceBySymbol} loading={loading} />

          {/* Selected Crypto Info */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20 text-warning font-bold text-xl">
                  {selectedCrypto.charAt(0)}
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

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">{t("analyzer.currentPrice")}</div>
                <div className="text-2xl font-bold text-foreground">${selected.price.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("analyzer.change24h")}</div>
                <div className={`text-2xl font-bold ${selected.change >= 0 ? "text-success" : "text-destructive"}`}>
                  {selected.change >= 0 ? "+" : ""}{selected.change.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("analyzer.high24h")}</div>
                <div className="font-semibold text-foreground">
                  ${getPriceBySymbol(selectedCrypto)?.high_24h?.toLocaleString() || "---"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("analyzer.low24h")}</div>
                <div className="font-semibold text-foreground">
                  ${getPriceBySymbol(selectedCrypto)?.low_24h?.toLocaleString() || "---"}
                </div>
              </div>
            </div>
          </div>

          {/* Live On-Chain Data */}
          <OnChainMetrics
            crypto={selectedCrypto}
            price={selected.price}
            change={selected.change}
          />

          {/* AI Analyzer & Sentiment Analysis Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            <AIAnalyzer 
              crypto={selectedCrypto} 
              price={selected.price} 
              change={selected.change}
              high24h={getPriceBySymbol(selectedCrypto)?.high_24h}
              low24h={getPriceBySymbol(selectedCrypto)?.low_24h}
              volume={getPriceBySymbol(selectedCrypto)?.total_volume}
              marketCap={getPriceBySymbol(selectedCrypto)?.market_cap}
            />
            <SentimentAnalysis
              crypto={selectedCrypto}
              price={selected.price}
              change={selected.change}
            />
          </div>

          {/* Additional Analysis Tips */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t("analyzer.analysisGuide")}</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-secondary/50">
                <h4 className="font-medium text-foreground mb-2">{t("analyzer.ictAnalysis")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("analyzer.ictDesc")}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50">
                <h4 className="font-medium text-foreground mb-2">{t("analyzer.smartMoneyConcepts")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("analyzer.smartMoneyDesc")}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50">
                <h4 className="font-medium text-foreground mb-2">{t("analyzer.vwapIndicator")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("analyzer.vwapDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analyzer;
