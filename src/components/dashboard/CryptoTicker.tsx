import { cn } from "@/lib/utils";
import { CryptoPrice } from "@/hooks/useCryptoPrices";
import { useCurrency } from "@/hooks/useCurrency";
import { Circle, Zap, Link2 } from "lucide-react";

const cryptoMeta = [
  { symbol: "BTC", name: "Bitcoin", color: "text-warning" },
  { symbol: "ETH", name: "Ethereum", color: "text-muted-foreground" },
  { symbol: "SOL", name: "Solana", color: "text-chart-cyan" },
  { symbol: "XRP", name: "Ripple", color: "text-muted-foreground" },
  { symbol: "DOGE", name: "Dogecoin", color: "text-warning" },
  { symbol: "KAS", name: "Kaspa", color: "text-chart-cyan" },
  { symbol: "ADA", name: "Cardano", color: "text-primary" },
  { symbol: "AVAX", name: "Avalanche", color: "text-destructive" },
  { symbol: "LINK", name: "Chainlink", color: "text-primary" },
  { symbol: "DOT", name: "Polkadot", color: "text-chart-pink" },
];

interface OracleStatus {
  isLive: boolean;
  primarySource: "Pyth" | "Chainlink" | "none";
  pythConnected: boolean;
  chainlinkConnected: boolean;
}

interface CryptoTickerProps {
  selected: string;
  onSelect: (symbol: string) => void;
  getPriceBySymbol: (symbol: string) => CryptoPrice | undefined;
  loading: boolean;
  oracleStatus?: OracleStatus;
  isLive?: boolean;
  connectedExchanges?: string[];
}

const CryptoTicker = ({ 
  selected, 
  onSelect, 
  getPriceBySymbol, 
  loading,
  oracleStatus,
  isLive,
  connectedExchanges = []
}: CryptoTickerProps) => {
  const { formatPrice } = useCurrency();
  
  // Determine oracle display
  const getOracleIcon = () => {
    if (oracleStatus?.pythConnected) {
      return <Zap className="h-3 w-3 text-chart-cyan" />;
    }
    if (oracleStatus?.chainlinkConnected) {
      return <Link2 className="h-3 w-3 text-primary" />;
    }
    return null;
  };
  
  const getOracleLabel = () => {
    if (oracleStatus?.pythConnected) return "Pyth";
    if (oracleStatus?.chainlinkConnected) return "Chainlink";
    return null;
  };
  
  return (
    <div className="space-y-2">
      {/* Oracle Status Bar */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Circle 
            className={cn(
              "h-2 w-2",
              isLive ? "fill-success text-success animate-pulse" : "fill-muted text-muted"
            )} 
          />
          <span className="text-muted-foreground">
            {isLive ? "Live" : "Connecting..."}
          </span>
        </div>
        
        {/* Oracle Source */}
        {oracleStatus?.isLive && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/50 border border-border">
            {getOracleIcon()}
            <span className="text-foreground font-medium">{getOracleLabel()}</span>
            <span className="text-muted-foreground">Oracle</span>
          </div>
        )}
        
        {/* Exchange Sources */}
        {connectedExchanges.filter(e => e !== "Pyth" && e !== "Chainlink").length > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>+</span>
            <span>{connectedExchanges.filter(e => e !== "Pyth" && e !== "Chainlink").join(", ")}</span>
          </div>
        )}
      </div>
      
      {/* Crypto Buttons */}
      <div className="flex flex-wrap gap-3">
        {cryptoMeta.map((crypto) => {
          const livePrice = getPriceBySymbol(crypto.symbol);
          const price = livePrice?.current_price || 0;
          const change = livePrice?.price_change_percentage_24h || 0;
          const source = livePrice?.source;
          
          // Determine if this price is from an oracle
          const isOraclePrice = source?.includes("Oracle") || source === "Pyth" || source === "Chainlink";
          
          return (
            <button
              key={crypto.symbol}
              onClick={() => onSelect(crypto.symbol)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border px-4 py-3 transition-all relative",
                selected === crypto.symbol
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              {/* Oracle indicator dot */}
              {isOraclePrice && (
                <div className="absolute top-1 right-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-chart-cyan animate-pulse" />
                </div>
              )}
              
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
                {loading ? "..." : formatPrice(price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CryptoTicker;
