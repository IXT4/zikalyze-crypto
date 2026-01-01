import { useCryptoPrices, CryptoPrice } from "@/hooks/useCryptoPrices";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Top100CryptoListProps {
  onSelect: (symbol: string) => void;
  selected: string;
}

interface PriceFlash {
  [symbol: string]: "up" | "down" | null;
}

const Top100CryptoList = ({ onSelect, selected }: Top100CryptoListProps) => {
  const { prices, loading } = useCryptoPrices();
  const [flashes, setFlashes] = useState<PriceFlash>({});
  const prevPricesRef = useRef<Map<string, number>>(new Map());

  // Track price changes and trigger flash animations
  useEffect(() => {
    if (prices.length === 0) return;

    const newFlashes: PriceFlash = {};
    
    prices.forEach((crypto) => {
      const prevPrice = prevPricesRef.current.get(crypto.symbol);
      if (prevPrice !== undefined && prevPrice !== crypto.current_price) {
        if (crypto.current_price > prevPrice) {
          newFlashes[crypto.symbol] = "up";
        } else if (crypto.current_price < prevPrice) {
          newFlashes[crypto.symbol] = "down";
        }
      }
      prevPricesRef.current.set(crypto.symbol, crypto.current_price);
    });

    if (Object.keys(newFlashes).length > 0) {
      setFlashes(prev => ({ ...prev, ...newFlashes }));
      
      // Clear flashes after animation
      setTimeout(() => {
        setFlashes(prev => {
          const updated = { ...prev };
          Object.keys(newFlashes).forEach(key => {
            updated[key] = null;
          });
          return updated;
        });
      }, 600);
    }
  }, [prices]);

  if (loading) {
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
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-foreground">Top 100 Cryptocurrencies</h3>
          <span className="flex items-center gap-1.5 text-xs text-success">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            LIVE
          </span>
        </div>
        <span className="text-xs text-muted-foreground">By Market Cap (excl. stablecoins)</span>
      </div>
      
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="pb-3 font-medium">#</th>
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium text-right">Price</th>
              <th className="pb-3 font-medium text-right">24h %</th>
              <th className="pb-3 font-medium text-right hidden sm:table-cell">24h High</th>
              <th className="pb-3 font-medium text-right hidden sm:table-cell">24h Low</th>
              <th className="pb-3 font-medium text-right hidden md:table-cell">Volume</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((crypto, index) => {
              const isPositive = crypto.price_change_percentage_24h >= 0;
              const isSelected = crypto.symbol.toUpperCase() === selected;
              const flash = flashes[crypto.symbol];
              
              const rowFlashClass = flash === "up" 
                ? "animate-flash-green" 
                : flash === "down" 
                  ? "animate-flash-red" 
                  : "";
              
              const priceFlashClass = flash === "up"
                ? "animate-price-up"
                : flash === "down"
                  ? "animate-price-down"
                  : "";
              
              return (
                <tr
                  key={crypto.id}
                  onClick={() => onSelect(crypto.symbol.toUpperCase())}
                  className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/50 ${
                    isSelected ? "bg-primary/10" : ""
                  } ${rowFlashClass}`}
                >
                  <td className="py-3 text-sm text-muted-foreground">{index + 1}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-xs font-bold text-foreground">
                        {crypto.symbol.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">{crypto.name}</div>
                        <div className="text-xs text-muted-foreground">{crypto.symbol.toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`py-3 text-right font-medium text-foreground text-sm ${priceFlashClass}`}>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Top100CryptoList;
