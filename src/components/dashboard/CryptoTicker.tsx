import { cn } from "@/lib/utils";
import { CryptoPrice } from "@/hooks/useCryptoPrices";
import { Zap, Link2 } from "lucide-react";
import { PriceChange } from "./PriceChange";
import { LivePriceLarge } from "./LivePrice";
import MiniSparkline from "./MiniSparkline";
import { usePriceHistory } from "@/hooks/usePriceHistory";

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
  primarySource: "Pyth" | "DIA" | "Redstone" | "none";
  pythConnected: boolean;
  diaConnected?: boolean;
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

const CryptoTicker = ({ 
  selected, 
  onSelect, 
  getPriceBySymbol, 
  loading,
  oracleStatus,
  isLive,
  connectedExchanges = []
}: CryptoTickerProps) => {
  
  // Get price history for sparklines
  const tickerSymbols = cryptoMeta.map(c => c.symbol);
  const { getHistory } = usePriceHistory(tickerSymbols);
  
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
          <span 
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              isLive 
                ? "bg-success animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_8px_2px_hsl(var(--success)/0.6)]" 
                : "bg-muted-foreground/50 animate-[pulse_2s_ease-in-out_infinite]"
            )} 
          />
          <span className={cn(
            "font-medium",
            isLive ? "text-success" : "text-muted-foreground"
          )}>
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
          const sparklineData = getHistory(crypto.symbol);
          
          // Show live dot for all cryptos when stream is live and price is available
          const showTickDot = !!isLive && price > 0;
          
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
              {/* Live tick dot */}
              {showTickDot && (
                <div className="absolute top-1 right-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-chart-cyan animate-pulse" />
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className={cn("font-bold", crypto.color)}>{crypto.symbol}</span>
                <PriceChange 
                  value={change} 
                  size="sm" 
                  showBadge={false}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <LivePriceLarge value={price} />
                <MiniSparkline 
                  data={sparklineData} 
                  width={40} 
                  height={16} 
                  className="opacity-80"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CryptoTicker;
