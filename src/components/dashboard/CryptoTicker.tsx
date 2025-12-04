import { cn } from "@/lib/utils";

const cryptos = [
  { symbol: "BTC", name: "Bitcoin", price: 86512, change: -4.87, color: "text-warning" },
  { symbol: "ETH", name: "Ethereum", price: 2842, change: -5.46, color: "text-muted-foreground" },
  { symbol: "SOL", name: "Solana", price: 127.18, change: -6.85, color: "text-chart-cyan" },
  { symbol: "XRP", name: "Ripple", price: 2.05, change: -6.63, color: "text-muted-foreground" },
  { symbol: "DOGE", name: "Dogecoin", price: 0.1376, change: -7.84, color: "text-warning" },
];

interface CryptoTickerProps {
  selected: string;
  onSelect: (symbol: string) => void;
}

const CryptoTicker = ({ selected, onSelect }: CryptoTickerProps) => {
  return (
    <div className="flex flex-wrap gap-3">
      {cryptos.map((crypto) => (
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
                crypto.change >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {crypto.change >= 0 ? "↗" : "↘"} {Math.abs(crypto.change)}%
            </span>
          </div>
          <span className="text-lg font-semibold text-foreground">
            ${crypto.price.toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  );
};

export default CryptoTicker;
