// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ GPUPriceChart — Real-Time Live Streaming GPU-Accelerated Price Chart
// ═══════════════════════════════════════════════════════════════════════════════
// Uses WebGPU/WebGL2/Canvas2D for 60+ FPS smooth rendering
// Features: Live streaming, timeframe selection, glow effects, flash animations
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect, useState, useCallback, memo, useMemo } from "react";
import { Zap, Cpu, Activity, Radio, TrendingUp, TrendingDown, Clock, Bell, ChevronDown, Search } from "lucide-react";
import { useDecentralizedChartData, type ChartTimeframe, TIMEFRAME_CONFIG } from "@/hooks/useDecentralizedChartData";
import { createGPUChartManager, type GPUChartInstance } from "@/lib/gpu/gpu-chart-manager";
import type { ChartDataPoint, RenderBackend } from "@/lib/gpu/webgpu-chart-renderer";
import { cn } from "@/lib/utils";
import {
  OracleSourceBadge,
  OracleConnectionDots,
  LiveBadge,
  ChartBuildingState,
  ChartConnectingState,
} from "./charts/OracleStatusIndicators";
import { useCurrency } from "@/hooks/useCurrency";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useCryptoPrices, type CryptoPrice } from "@/hooks/useCryptoPrices";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GPUPriceChartProps {
  crypto: string;
  change24h?: number;
  height?: number;
  showControls?: boolean;
  className?: string;
  onSelectCrypto?: (symbol: string) => void;
  prices?: CryptoPrice[];
}

const TIMEFRAMES: ChartTimeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

const BackendBadge = memo(({ backend }: { backend: RenderBackend }) => {
  const labels: Record<RenderBackend, { label: string; color: string; icon: string }> = {
    webgpu: { label: "WebGPU", color: "bg-emerald-500/20 text-emerald-400", icon: "⚡" },
    webgl2: { label: "WebGL2", color: "bg-blue-500/20 text-blue-400", icon: "🎮" },
    canvas2d: { label: "Canvas", color: "bg-amber-500/20 text-amber-400", icon: "🖼️" },
  };
  
  const { label, color, icon } = labels[backend];
  
  return (
    <span className={cn("flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", color)}>
      <span>{icon}</span>
      {label}
    </span>
  );
});

BackendBadge.displayName = "BackendBadge";

const LiveStreamBadge = memo(({ isStreaming, tickRate }: { isStreaming: boolean; tickRate: number }) => (
  <span className={cn(
    "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all",
    isStreaming 
      ? "bg-red-500/20 text-red-400 animate-pulse" 
      : "bg-muted text-muted-foreground"
  )}>
    <Radio className="h-3 w-3" />
    <span>LIVE</span>
    {isStreaming && <span className="opacity-70">{tickRate}/s</span>}
  </span>
));

LiveStreamBadge.displayName = "LiveStreamBadge";

interface TimeframeSelectorProps {
  selected: ChartTimeframe;
  onSelect: (tf: ChartTimeframe) => void;
}

const TimeframeSelector = memo(({ selected, onSelect }: TimeframeSelectorProps) => (
  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
    {TIMEFRAMES.map((tf) => (
      <button
        key={tf}
        onClick={() => onSelect(tf)}
        className={cn(
          "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
          selected === tf
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        {tf}
      </button>
    ))}
  </div>
));

TimeframeSelector.displayName = "TimeframeSelector";

// Crypto selector dropdown component - uses live WebSocket prices
const CryptoSelector = memo(({ 
  crypto, 
  onSelect 
}: { 
  crypto: string; 
  onSelect: (symbol: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  // Use live prices from WebSocket for real-time updates
  const { prices: livePrices } = useCryptoPrices();
  
  const filteredPrices = useMemo(() => {
    if (!search) return livePrices.slice(0, 100);
    const query = search.toLowerCase();
    return livePrices.filter(p => 
      p.symbol.toLowerCase().includes(query) || 
      p.name.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [livePrices, search]);
  
  const selectedCrypto = livePrices.find(p => p.symbol.toUpperCase() === crypto.toUpperCase());
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-lg font-semibold text-foreground hover:text-primary transition-colors group">
          <div className="flex items-center gap-2">
            {selectedCrypto?.image && (
              <img src={selectedCrypto.image} alt={crypto} className="w-6 h-6 rounded-full" />
            )}
            <span>{crypto}/USD</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search top 100..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-1">
            {filteredPrices.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p.symbol.toUpperCase());
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors",
                  p.symbol.toUpperCase() === crypto.toUpperCase()
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <span className="w-6 text-xs text-muted-foreground font-medium">
                  #{p.market_cap_rank || idx + 1}
                </span>
                {p.image && (
                  <img src={p.image} alt={p.symbol} className="w-5 h-5 rounded-full" />
                )}
                <div className="flex-1 text-left">
                  <div className="font-medium">{p.symbol.toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.name}</div>
                </div>
                <div className={cn(
                  "text-xs font-medium",
                  (p.price_change_percentage_24h ?? 0) >= 0 ? "text-success" : "text-destructive"
                )}>
                  {(p.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}
                  {(p.price_change_percentage_24h ?? 0).toFixed(1)}%
                </div>
              </button>
            ))}
            {filteredPrices.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No results found
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
});

CryptoSelector.displayName = "CryptoSelector";

const GPUPriceChart = ({
  crypto,
  change24h,
  height = 320,
  showControls = false,
  className,
  onSelectCrypto,
  prices: externalPrices,
}: GPUPriceChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<GPUChartInstance | null>(null);
  const [backend, setBackend] = useState<RenderBackend | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height });
  const [tickRate, setTickRate] = useState(0);
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("1m");
  const lastPriceRef = useRef<number>(0);
  const tickWindowRef = useRef<number[]>([]);
  const { formatPrice } = useCurrency();
  
  // Use external prices if provided, otherwise fetch internally
  const { prices: internalPrices } = useCryptoPrices();
  const prices = externalPrices || internalPrices;
  
  // Get active alerts for this crypto
  const { alerts } = usePriceAlerts();
  const activeAlerts = alerts.filter(a => a.symbol.toUpperCase() === crypto.toUpperCase());
  
  const {
    chartData,
    priceChange,
    isBuilding,
    isLive,
    currentSource,
    oracleStatus,
    dataPointCount,
    timeframeConfig,
    rawTickCount,
  } = useDecentralizedChartData(crypto, timeframe);
  
  const displayChange = change24h ?? priceChange;
  const isPositive = displayChange >= 0;
  
  // Use chart data price, with fallback to live prices for immediate display
  const liveCryptoPrice = prices.find(p => p.symbol.toUpperCase() === crypto.toUpperCase());
  const currentPrice = chartData.length > 0 
    ? chartData[chartData.length - 1].price 
    : (liveCryptoPrice?.current_price ?? 0);
  
  // Calculate nearest alert target
  const nearestAlert = activeAlerts.length > 0 
    ? activeAlerts.reduce((nearest, alert) => {
        const currentDist = Math.abs(currentPrice - alert.target_price);
        const nearestDist = Math.abs(currentPrice - (nearest?.target_price || 0));
        return currentDist < nearestDist ? alert : nearest;
      }, activeAlerts[0])
    : null;
  
  const alertProximityPercent = nearestAlert && currentPrice > 0
    ? Math.abs((nearestAlert.target_price - currentPrice) / currentPrice * 100)
    : null;
  
  // Calculate tick rate (updates per second)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      tickWindowRef.current = tickWindowRef.current.filter(t => now - t < 1000);
      setTickRate(tickWindowRef.current.length);
    }, 200);
    
    return () => clearInterval(interval);
  }, []);
  
  // Track price updates
  useEffect(() => {
    if (currentPrice !== lastPriceRef.current && currentPrice > 0) {
      tickWindowRef.current.push(Date.now());
      
      // Trigger flash on significant price movement
      if (lastPriceRef.current > 0) {
        const pctChange = Math.abs((currentPrice - lastPriceRef.current) / lastPriceRef.current * 100);
        if (pctChange > 0.05 && chartManagerRef.current) {
          chartManagerRef.current.triggerFlash(currentPrice > lastPriceRef.current ? "up" : "down");
        }
      }
      
      lastPriceRef.current = currentPrice;
    }
  }, [currentPrice]);
  
  // Initialize GPU chart manager
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let mounted = true;
    
    const init = async () => {
      const manager = await createGPUChartManager(canvas, dimensions.width, dimensions.height);
      
      if (mounted) {
        chartManagerRef.current = manager;
        setBackend(manager.getBackend());
      } else {
        manager.destroy();
      }
    };
    
    init();
    
    return () => {
      mounted = false;
      if (chartManagerRef.current) {
        chartManagerRef.current.destroy();
        chartManagerRef.current = null;
      }
    };
  }, []);
  
  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions({ width, height });
          chartManagerRef.current?.resize(width, height);
        }
      }
    });
    
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, [height]);
  
  // Real-time chart data streaming
  useEffect(() => {
    if (!chartManagerRef.current || chartData.length < 2) return;
    
    const now = Date.now();
    const gpuData: ChartDataPoint[] = chartData.map((point) => ({
      timestamp: point.timestamp || now - (chartData.length - chartData.indexOf(point) - 1) * 1000,
      price: point.price,
    }));
    
    chartManagerRef.current.render(gpuData, isPositive);
  }, [chartData, isPositive]);
  
  // Update config when theme changes
  useEffect(() => {
    if (!chartManagerRef.current) return;
    
    chartManagerRef.current.updateConfig({
      colors: {
        bullish: [0.38, 0.87, 0.62, 1.0],
        bearish: [0.98, 0.28, 0.35, 1.0],
        grid: [0.18, 0.22, 0.30, 0.3],
        text: [0.65, 0.68, 0.73, 1.0],
        background: [0.04, 0.05, 0.08, 1.0],
      },
    });
  }, []);
  
  const triggerManualFlash = useCallback((type: "up" | "down") => {
    chartManagerRef.current?.triggerFlash(type);
  }, []);
  
  const activeSource = currentSource || oracleStatus.primarySource;
  
  const renderContent = () => {
    if (isBuilding && dataPointCount < 3) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <ChartBuildingState dataPointCount={dataPointCount} />
        </div>
      );
    }
    if (!isLive && dataPointCount === 0) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <ChartConnectingState />
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className={cn("rounded-2xl border border-border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 sm:p-6 pb-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {onSelectCrypto ? (
              <CryptoSelector 
                crypto={crypto} 
                onSelect={onSelectCrypto} 
              />
            ) : (
              <h3 className="text-lg font-semibold text-foreground">{crypto}/USD</h3>
            )}
            <OracleSourceBadge source={activeSource} />
            {backend && <BackendBadge backend={backend} />}
            <LiveStreamBadge isStreaming={isLive && tickRate > 0} tickRate={tickRate} />
          </div>
          
          <div className="flex items-center gap-3">
            <OracleConnectionDots status={oracleStatus} />
            {chartData.length > 0 && (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium",
                    isPositive ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  )}
                >
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {isPositive ? "+" : ""}
                  {displayChange.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Current Price Display */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-2xl sm:text-3xl font-bold tabular-nums",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {formatPrice(currentPrice)}
              </span>
              <span className="text-xs text-muted-foreground">
                {change24h !== undefined ? "24h" : timeframeConfig.label}
              </span>
            </div>
            
            {/* Active Alert Indicator */}
            {nearestAlert && (
              <div className={cn(
                "flex items-center gap-1.5 mt-1 text-xs",
                alertProximityPercent && alertProximityPercent < 2 
                  ? "text-amber-400 animate-pulse" 
                  : "text-muted-foreground"
              )}>
                <Bell className="h-3 w-3" />
                <span>
                  Alert: {nearestAlert.condition} ${nearestAlert.target_price.toLocaleString()}
                  {alertProximityPercent && (
                    <span className="ml-1 opacity-70">
                      ({alertProximityPercent.toFixed(1)}% away)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
          
          {/* Timeframe Selector */}
          <TimeframeSelector selected={timeframe} onSelect={setTimeframe} />
        </div>
      </div>
      
      {/* Chart Container */}
      <div 
        ref={containerRef} 
        className="relative px-2 pb-4 mt-4"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ 
            width: dimensions.width, 
            height: dimensions.height,
          }}
        />
        {renderContent()}
      </div>
      
      {/* Footer Stats */}
      <div className="px-4 pb-4 sm:px-6 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span>{dataPointCount} candles</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{rawTickCount} ticks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>{tickRate}/s</span>
          </div>
        </div>
        
        {/* Alert Count & Controls */}
        <div className="flex items-center gap-2">
          {activeAlerts.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <Bell className="h-3.5 w-3.5" />
              <span>{activeAlerts.length}</span>
            </span>
          )}
          
          {showControls && (
            <>
              <button
                onClick={() => triggerManualFlash("up")}
                className="rounded bg-success/20 px-2 py-1 text-success hover:bg-success/30 transition-colors"
              >
                ↑
              </button>
              <button
                onClick={() => triggerManualFlash("down")}
                className="rounded bg-destructive/20 px-2 py-1 text-destructive hover:bg-destructive/30 transition-colors"
              >
                ↓
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(GPUPriceChart);
