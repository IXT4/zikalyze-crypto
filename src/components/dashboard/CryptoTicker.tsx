import { cn } from "@/lib/utils";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

const cryptoMeta = [
  { symbol: "BTC", name: "Bitcoin", color: "text-warning" },
  { symbol: "ETH", name: "Ethereum", color: "text-muted-foreground" },
  { symbol: "SOL", name: "Solana", color: "text-chart-cyan" },
  { symbol: "XRP", name: "Ripple", color: "text-muted-foreground" },
  { symbol: "DOGE", name: "Dogecoin", color: "text-warning" },
];

interface CryptoTickerProps {
  selected: string;
  onSelect: (symbol: string) => void;
}

const CryptoTicker = ({ selected, onSelect }: CryptoTickerProps) => {
  const { getPriceBySymbol, loading } = useCryptoPrices();
  return (
    <div className="flex flex-wrap gap-3">
      {cryptoMeta.map((crypto) => {
        const livePrice = getPriceBySymbol(crypto.symbol);
        const price = livePrice?.current_price || 0;
        const change = livePrice?.price_change_percentage_24h || 0;
        
        return (
          <button
            key={crypto.symbol}
            onClick={() => onSelect(crypto.symbol)}
            className={cn(
              "flex flex-col gap-1 rounded-xl border px-4 py-3 transition-all",
              selected === crypto.symbol
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("font-bold", crypto.color)}>{crypto.symbol}</span>
              <span
                className={cn(
                  "text-xs",
                  change >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {change >= 0 ? "↗" : "↘"} {Math.abs(change).toFixed(2)}%
              </span>
            </div>
            <span className="text-lg font-semibold text-foreground">
              {loading ? "..." : `$${price.toLocaleString()}`}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CryptoTicker;
