import { useState, useEffect } from "react";
import { useCryptoPrices, CryptoPrice } from "@/hooks/useCryptoPrices";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { TrendingUp, TrendingDown, Bell, X, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Top100CryptoListProps {
  onSelect: (symbol: string) => void;
  selected: string;
}

const Top100CryptoList = ({ onSelect, selected }: Top100CryptoListProps) => {
  const { prices, loading: pricesLoading } = useCryptoPrices();
  const { alerts, loading: alertsLoading, createAlert, removeAlert, checkAlerts } = usePriceAlerts();
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedCryptoForAlert, setSelectedCryptoForAlert] = useState<CryptoPrice | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [alertCondition, setAlertCondition] = useState<"above" | "below">("above");

  // Check alerts whenever prices update
  useEffect(() => {
    if (prices.length > 0 && alerts.length > 0) {
      checkAlerts(prices);
    }
  }, [prices, alerts, checkAlerts]);

  const handleOpenAlertDialog = (crypto: CryptoPrice, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCryptoForAlert(crypto);
    setTargetPrice(crypto.current_price.toString());
    setAlertDialogOpen(true);
  };

  const handleCreateAlert = async () => {
    if (!selectedCryptoForAlert || !targetPrice) return;

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

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">Top 100 Cryptocurrencies</h3>
            <span className="rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-medium text-success flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
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
                        {alert.condition} ${alert.target_price.toLocaleString()}
                      </span>
                      {crypto && (
                        <span className="text-muted-foreground">
                          (now: ${currentPrice.toLocaleString()})
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
                <th className="pb-3 font-medium text-right">Price</th>
                <th className="pb-3 font-medium text-right">24h %</th>
                <th className="pb-3 font-medium text-right hidden sm:table-cell">24h High</th>
                <th className="pb-3 font-medium text-right hidden sm:table-cell">24h Low</th>
                <th className="pb-3 font-medium text-right hidden md:table-cell">Volume</th>
                <th className="pb-3 font-medium text-center">Alert</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((crypto, index) => {
                const isPositive = crypto.price_change_percentage_24h >= 0;
                const isSelected = crypto.symbol.toUpperCase() === selected;
                const hasAlert = alerts.some(a => a.symbol === crypto.symbol.toUpperCase());
                
                return (
                  <tr
                    key={crypto.id}
                    onClick={() => onSelect(crypto.symbol.toUpperCase())}
                    className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/50 ${
                      isSelected ? "bg-primary/10" : ""
                    }`}
                  >
                    <td className="py-3 text-sm text-muted-foreground">{index + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={crypto.image} 
                          alt={crypto.name}
                          className="w-10 h-10 rounded-full shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{crypto.name}</div>
                          <div className="text-xs text-muted-foreground font-semibold">{crypto.symbol.toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium text-foreground text-sm">
                      ${crypto.current_price < 1 
                        ? crypto.current_price.toFixed(6) 
                        : crypto.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right">
                      <div className={`flex items-center justify-end gap-1 text-sm ${isPositive ? "text-success" : "text-destructive"}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-3 text-right text-sm text-muted-foreground hidden sm:table-cell">
                      ${crypto.high_24h < 1 
                        ? crypto.high_24h?.toFixed(6) 
                        : crypto.high_24h?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "---"}
                    </td>
                    <td className="py-3 text-right text-sm text-muted-foreground hidden sm:table-cell">
                      ${crypto.low_24h < 1 
                        ? crypto.low_24h?.toFixed(6) 
                        : crypto.low_24h?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "---"}
                    </td>
                    <td className="py-3 text-right text-sm text-muted-foreground hidden md:table-cell">
                      ${(crypto.total_volume / 1e6).toFixed(1)}M
                    </td>
                    <td className="py-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${hasAlert ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                        onClick={(e) => handleOpenAlertDialog(crypto, e)}
                      >
                        <Bell className={`w-4 h-4 ${hasAlert ? "fill-current" : ""}`} />
                      </Button>
                    </td>
                  </tr>
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
                  Current: ${selectedCryptoForAlert?.current_price.toLocaleString()}
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
              />
            </div>

            <Button onClick={handleCreateAlert} className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              Create Alert
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You'll receive a browser notification when the price target is hit.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Top100CryptoList;