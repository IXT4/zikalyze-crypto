import { useState, useEffect, useRef, useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { useCryptoPrices, CryptoPrice } from "@/hooks/useCryptoPrices";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useCurrency } from "@/hooks/useCurrency";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useGlobalPriceWebSocket } from "@/hooks/useGlobalPriceWebSocket";
import { Bell, X, BellRing, Search, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PriceChangeCompact } from "./PriceChange";
import { LivePriceCompact } from "./LivePrice";
import MiniSparkline from "./MiniSparkline";
import { cn } from "@/lib/utils";

interface Top100CryptoListProps {
  onSelect: (symbol: string) => void;
  selected: string;
  prices?: CryptoPrice[];
  loading?: boolean;
}

// Memoized row component with flash animation on price changes
interface CryptoRowProps {
  crypto: CryptoPrice;
  index: number;
  isSelected: boolean;
  hasAlert: boolean;
  sparklineData: number[];
  livePrice: number;
  formatPrice: (price: number) => string;
  currencySymbol: string;
  onSelect: (symbol: string) => void;
  onAlertClick: (crypto: CryptoPrice, e: React.MouseEvent) => void;
}

const CryptoRow = memo(({
  crypto,
  index,
  isSelected,
  hasAlert,
  sparklineData,
  livePrice,
  formatPrice,
  currencySymbol,
  onSelect,
  onAlertClick,
}: CryptoRowProps) => {
  return (
    <tr
      onClick={() => onSelect(crypto.symbol.toUpperCase())}
      className={cn(
        "border-b border-border/50 cursor-pointer transition-colors duration-200 hover:bg-secondary/50",
        isSelected && "bg-primary/10"
      )}
    >
      <td className="py-3 text-sm text-muted-foreground">{index + 1}</td>
      <td className="py-3">
        <div className="flex items-center gap-3">
          <img
            src={crypto.image}
            alt={crypto.name}
            className="w-10 h-10 rounded-full shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="min-w-0">
            <div className="font-medium text-foreground text-sm truncate">{crypto.name}</div>
            <div className="text-xs text-muted-foreground font-semibold">{crypto.symbol.toUpperCase()}</div>
          </div>
        </div>
      </td>
      <td className="py-3 text-right">
        <LivePriceCompact value={livePrice} />
      </td>
      <td className="py-3 text-center hidden xs:table-cell">
        <div className="flex justify-center">
          <MiniSparkline data={sparklineData} width={50} height={20} />
        </div>
      </td>
      <td className="py-3 text-right">
        <PriceChangeCompact value={crypto.price_change_percentage_24h} />
      </td>
      <td className="py-3 text-right text-sm text-muted-foreground hidden sm:table-cell">
        {currencySymbol}
        {crypto.market_cap ? (crypto.market_cap / 1e9).toFixed(2) + "B" : "---"}
      </td>
      <td className="py-3 text-right text-sm text-muted-foreground hidden md:table-cell">
        {crypto.circulating_supply
          ? crypto.circulating_supply >= 1e9
            ? (crypto.circulating_supply / 1e9).toFixed(2) + "B"
            : crypto.circulating_supply >= 1e6
            ? (crypto.circulating_supply / 1e6).toFixed(2) + "M"
            : crypto.circulating_supply.toLocaleString()
          : "---"}{" "}
        {crypto.symbol.toUpperCase()}
      </td>
      <td className="py-3 text-right text-sm text-muted-foreground hidden lg:table-cell">
        {crypto.high_24h ? formatPrice(crypto.high_24h) : "---"}
      </td>
      <td className="py-3 text-right text-sm text-muted-foreground hidden lg:table-cell">
        {crypto.low_24h ? formatPrice(crypto.low_24h) : "---"}
      </td>
      <td className="py-3 text-right text-sm text-muted-foreground hidden xl:table-cell">
        {(() => {
          const v = crypto.total_volume;
          if (!v) return "---";
          if (v >= 1e9) return `${currencySymbol}${(v / 1e9).toFixed(2)}B`;
          if (v >= 1e6) return `${currencySymbol}${(v / 1e6).toFixed(1)}M`;
          if (v >= 1e3) return `${currencySymbol}${(v / 1e3).toFixed(1)}K`;
          return `${currencySymbol}${v.toFixed(0)}`;
        })()}
      </td>
      <td className="py-3 text-center">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${hasAlert ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          onClick={(e) => onAlertClick(crypto, e)}
        >
          <Bell className={`w-4 h-4 ${hasAlert ? "fill-current" : ""}`} />
        </Button>
      </td>
    </tr>
  );
});

CryptoRow.displayName = "CryptoRow";


const Top100CryptoList = ({ onSelect, selected, prices: propPrices, loading: propLoading }: Top100CryptoListProps) => {
  // Use prices from props if provided, otherwise fetch own (for standalone usage)
  const ownPrices = useCryptoPrices();
  const prices = propPrices ?? ownPrices.prices;
  const pricesLoading = propLoading ?? ownPrices.loading;
  const { alerts, loading: alertsLoading, createAlert, removeAlert, checkAlerts } = usePriceAlerts();
  const { formatPrice, symbol: currencySymbol } = useCurrency();
  const { t } = useTranslation();
  
  // Get all symbols for WebSocket and sparkline history (server supports 100 symbols max)
  const allSymbols = useMemo(
    () => Array.from(new Set(prices.slice(0, 100).map((p) => p.symbol.toUpperCase()))),
    [prices]
  );
  const { getHistory } = usePriceHistory(allSymbols);
  
  // Direct WebSocket access for real-time price updates
  const websocket = useGlobalPriceWebSocket(allSymbols);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedCryptoForAlert, setSelectedCryptoForAlert] = useState<CryptoPrice | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [alertCondition, setAlertCondition] = useState<"above" | "below">("above");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter prices based on search query
  const filteredPrices = useMemo(() => {
    if (!searchQuery.trim()) return prices;
    const query = searchQuery.toLowerCase().trim();
    return prices.filter(
      (crypto) =>
        crypto.name.toLowerCase().includes(query) ||
        crypto.symbol.toLowerCase().includes(query)
    );
  }, [prices, searchQuery]);

  // Track WebSocket update timestamps for "live" indicator
  const [lastWsUpdate, setLastWsUpdate] = useState<number>(0);
  const wsUpdateCountRef = useRef(0);


  // Check alerts whenever prices update - use a ref to track last check time
  const lastAlertCheckRef = useRef<number>(0);
  
  useEffect(() => {
    if (prices.length > 0 && alerts.length > 0) {
      // Throttle alert checks to every 2 seconds to prevent spam
      const now = Date.now();
      if (now - lastAlertCheckRef.current > 2000) {
        lastAlertCheckRef.current = now;
        checkAlerts(prices);
      }
    }
  }, [prices, alerts, checkAlerts]);

  const handleOpenAlertDialog = (crypto: CryptoPrice, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCryptoForAlert(crypto);
    setTargetPrice(crypto.current_price.toString());
    setAlertDialogOpen(true);
  };

  const getAlertValidation = () => {
    if (!selectedCryptoForAlert || !targetPrice) return { valid: false, error: "" };
    
    const target = parseFloat(targetPrice);
    const current = selectedCryptoForAlert.current_price;
    
    if (isNaN(target) || target <= 0) {
      return { valid: false, error: "Enter a valid price" };
    }
    
    if (alertCondition === "above" && target <= current) {
      return { valid: false, error: "Target must be above current price" };
    }
    
    if (alertCondition === "below" && target >= current) {
      return { valid: false, error: "Target must be below current price" };
    }
    
    return { valid: true, error: "" };
  };

  const handleCreateAlert = async () => {
    const validation = getAlertValidation();
    if (!validation.valid || !selectedCryptoForAlert) return;

    const success = await createAlert(
      selectedCryptoForAlert.symbol,
      selectedCryptoForAlert.name,
      parseFloat(targetPrice),
      alertCondition,
      selectedCryptoForAlert.current_price
    );

    if (success) {
      setAlertDialogOpen(false);
    }
  };

  const handleRemoveAlert = async (alertId: string) => {
    await removeAlert(alertId);
  };

  if (pricesLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Top 100 Cryptocurrencies</h3>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Calculate market sentiment for dynamic glow
  const gainers = filteredPrices.filter(p => p.price_change_percentage_24h > 0).length;
  const losers = filteredPrices.filter(p => p.price_change_percentage_24h < 0).length;
  const isBullishMarket = gainers > losers;

  return (
    <>
      <div className={cn(
        "rounded-2xl border border-border bg-card p-6 transition-shadow duration-500",
        websocket.connected && (isBullishMarket ? "animate-live-glow-bullish" : "animate-live-glow-bearish")
      )}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Top 100 Cryptocurrencies</h3>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                <BellRing className="w-3 h-3" />
                {alerts.length} Alert{alerts.length > 1 ? "s" : ""}
              </span>
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">By Market Cap</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or symbol (e.g. GoMining, BTC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <BellRing className="w-3 h-3" />
              Active Price Alerts
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.map((alert) => {
                const crypto = prices.find(p => p.symbol.toUpperCase() === alert.symbol);
                const currentPrice = crypto?.current_price || 0;
                const progressPercent = alert.condition === "above"
                  ? Math.min(100, (currentPrice / alert.target_price) * 100)
                  : Math.min(100, (alert.target_price / currentPrice) * 100);

                return (
                  <div
                    key={alert.id}
                    className="relative flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-xs overflow-hidden"
                  >
                    {/* Progress bar background */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-primary/10 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <div className="relative flex items-center gap-2">
                      <Bell className="w-3 h-3 text-primary" />
                      <span className="font-medium">{alert.symbol}</span>
                      <span className="text-muted-foreground">
                        {alert.condition} {formatPrice(alert.target_price)}
                      </span>
                      {crypto && (
                        <span className="text-muted-foreground">
                          (now: {formatPrice(currentPrice)})
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveAlert(alert.id)}
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium text-right">
                  <span className="inline-flex items-center gap-1.5">
                    Price
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  </span>
                </th>
                <th className="pb-3 font-medium text-center hidden xs:table-cell">Trend</th>
                <th className="pb-3 font-medium text-right">24h %</th>
                <th className="pb-3 font-medium text-right hidden sm:table-cell">Market Cap</th>
                <th className="pb-3 font-medium text-right hidden md:table-cell">Circulating Supply</th>
                <th className="pb-3 font-medium text-right hidden lg:table-cell">24h High</th>
                <th className="pb-3 font-medium text-right hidden lg:table-cell">24h Low</th>
                <th className="pb-3 font-medium text-right hidden xl:table-cell">Volume</th>
                <th className="pb-3 font-medium text-center">Alert</th>
              </tr>
            </thead>
            <tbody>
            {filteredPrices.map((crypto, index) => {
                const isSelected = crypto.symbol.toUpperCase() === selected;
                const hasAlert = alerts.some(a => a.symbol === crypto.symbol.toUpperCase());
                const sparklineData = getHistory(crypto.symbol.toUpperCase());
                
                // Get live WebSocket price
                const wsPrice = websocket.getPrice(crypto.symbol.toUpperCase());
                const livePrice = wsPrice?.price || crypto.current_price;
                
                return (
                  <CryptoRow
                    key={crypto.id}
                    crypto={crypto}
                    index={index}
                    isSelected={isSelected}
                    hasAlert={hasAlert}
                    sparklineData={sparklineData}
                    livePrice={livePrice}
                    formatPrice={formatPrice}
                    currencySymbol={currencySymbol}
                    onSelect={onSelect}
                    onAlertClick={handleOpenAlertDialog}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-primary" />
              Set Price Alert
            </DialogTitle>
            <DialogDescription>
              Get notified when {selectedCryptoForAlert?.name} ({selectedCryptoForAlert?.symbol.toUpperCase()}) reaches your target price.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              {selectedCryptoForAlert?.image && (
                <img 
                  src={selectedCryptoForAlert.image} 
                  alt={selectedCryptoForAlert.name}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <div className="font-medium">{selectedCryptoForAlert?.name}</div>
                <div className="text-sm text-muted-foreground">
                  Current: {selectedCryptoForAlert ? formatPrice(selectedCryptoForAlert.current_price) : "---"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Alert Condition</label>
              <div className="flex gap-2">
                <Button
                  variant={alertCondition === "above" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setAlertCondition("above")}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Price Above
                </Button>
                <Button
                  variant={alertCondition === "below" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setAlertCondition("below")}
                >
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Price Below
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Price (USD)</label>
              <Input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Enter target price"
                step="any"
                className={`h-12 text-lg font-semibold ${!getAlertValidation().valid && targetPrice ? "border-destructive" : ""}`}
              />
              {!getAlertValidation().valid && targetPrice && (
                <p className="text-xs text-destructive">{getAlertValidation().error}</p>
              )}
            </div>

            <Button 
              onClick={handleCreateAlert} 
              className="w-full"
              disabled={!getAlertValidation().valid}
            >
              <Bell className="w-4 h-4 mr-2" />
              Create Alert
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Top100CryptoList;
