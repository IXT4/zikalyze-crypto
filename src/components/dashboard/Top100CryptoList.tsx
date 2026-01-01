import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Top100CryptoListProps {
  onSelect: (symbol: string) => void;
  selected: string;
}

const Top100CryptoList = ({ onSelect, selected }: Top100CryptoListProps) => {
  const { prices, loading } = useCryptoPrices();

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
        <h3 className="text-lg font-bold text-foreground">Top 100 Cryptocurrencies</h3>
        <span className="text-xs text-muted-foreground">By Market Cap (excl. stablecoins)</span>
      </div>
      
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
            </tr>
          </thead>
          <tbody>
            {prices.map((crypto, index) => {
              const isPositive = crypto.price_change_percentage_24h >= 0;
              const isSelected = crypto.symbol.toUpperCase() === selected;
              
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
