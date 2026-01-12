import { useState, useEffect, useRef } from "react";
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
  primarySource: "Pyth" | "DIA" | "API3" | "Redstone" | "none";
  pythConnected: boolean;
  diaConnected?: boolean;
  api3Connected?: boolean;
  redstoneConnected?: boolean;
  // Legacy compatibility
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

// Track price changes for flash animations
type PriceFlash = "up" | "down" | null;

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
  
  // Track previous prices for flash animation
  const prevPricesRef = useRef<Map<string, number>>(new Map());
  const [priceFlashes, setPriceFlashes] = useState<Map<string, PriceFlash>>(new Map());

  // Detect price changes and trigger flash animations
  useEffect(() => {
    const newFlashes = new Map<string, PriceFlash>();
    
    cryptoMeta.forEach((crypto) => {
      const livePrice = getPriceBySymbol(crypto.symbol);
      const currentPrice = livePrice?.current_price || 0;
      const prevPrice = prevPricesRef.current.get(crypto.symbol);
      
      if (prevPrice !== undefined && prevPrice !== currentPrice && currentPrice > 0) {
        if (currentPrice > prevPrice) {
          newFlashes.set(crypto.symbol, "up");
        } else if (currentPrice < prevPrice) {
          newFlashes.set(crypto.symbol, "down");
        }
      }
      
      if (currentPrice > 0) {
        prevPricesRef.current.set(crypto.symbol, currentPrice);
      }
    });

    if (newFlashes.size > 0) {
      setPriceFlashes(prev => {
        const merged = new Map(prev);
        newFlashes.forEach((value, key) => merged.set(key, value));
        return merged;
      });

      // Clear flashes after animation
      setTimeout(() => {
        setPriceFlashes(prev => {
          const updated = new Map(prev);
          newFlashes.forEach((_, key) => updated.delete(key));
          return updated;
        });
      }, 500);
    }
  }, [getPriceBySymbol]);
  
  // Determine oracle display
  const getOracleIcon = () => {
    if (oracleStatus?.pythConnected) {
      return <Zap className="h-3 w-3 text-chart-cyan" />;
    }
    if (oracleStatus?.diaConnected || oracleStatus?.chainlinkConnected) {
      return <Link2 className="h-3 w-3 text-primary" />;
    }
    if (oracleStatus?.redstoneConnected) {
      return <Link2 className="h-3 w-3 text-destructive" />;
    }
    return null;
  };
  
  const getOracleLabel = () => {
    if (oracleStatus?.pythConnected) return "Pyth";
    if (oracleStatus?.diaConnected) return "DIA";
    if (oracleStatus?.redstoneConnected) return "Redstone";
    if (oracleStatus?.chainlinkConnected) return "DIA";
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
          const flash = priceFlashes.get(crypto.symbol);
          
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
                  : "border-border bg-card hover:border-primary/50",
                flash === "up" && "animate-price-flash-up",
                flash === "down" && "animate-price-flash-down"
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
                    "text-xs font-medium rounded px-1 transition-colors",
                    change >= 0 ? "text-success" : "text-destructive",
                    flash === "up" && "bg-success/20",
                    flash === "down" && "bg-destructive/20"
                  )}
                >
                  {change >= 0 ? "↗" : "↘"} {Math.abs(change).toFixed(2)}%
                </span>
              </div>
              <span 
                className={cn(
                  "text-lg font-semibold transition-colors rounded px-1",
                  flash === "up" ? "text-success" : flash === "down" ? "text-destructive" : "text-foreground"
                )}
              >
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
