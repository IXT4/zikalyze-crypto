// ═══════════════════════════════════════════════════════════════════════════════
// 🌡️ GPU Heatmap Component — Real-time Crypto Market Grid
// ═══════════════════════════════════════════════════════════════════════════════
// Displays all 100 cryptocurrencies in a color-coded grid
// Green = positive 24h change, Red = negative change
// Intensity correlates with magnitude of price movement
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, TrendingUp, TrendingDown, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import {
  createHeatmapAnimator,
  type HeatmapCell,
  type HeatmapAnimator,
} from "@/lib/gpu/gpu-heatmap-renderer";
import type { CryptoPrice } from "@/hooks/useCryptoPrices";

interface GPUHeatmapProps {
  prices: CryptoPrice[];
  loading?: boolean;
  onSelectCrypto?: (symbol: string) => void;
}

interface TooltipData {
  cell: HeatmapCell;
  x: number;
  y: number;
}

const GPUHeatmap = ({ prices, loading = false, onSelectCrypto }: GPUHeatmapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animatorRef = useRef<HeatmapAnimator | null>(null);
  const cellsRef = useRef<HeatmapCell[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState({ gainers: 0, losers: 0, unchanged: 0 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const { formatPrice, symbol: currencySymbol } = useCurrency();
  
  // Format large numbers (market cap, volume)
  const formatLargeNumber = useCallback((value: number): string => {
    if (value >= 1_000_000_000_000) return `${currencySymbol}${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (value >= 1_000_000_000) return `${currencySymbol}${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${currencySymbol}${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${currencySymbol}${(value / 1_000).toFixed(2)}K`;
    return `${currencySymbol}${value.toFixed(2)}`;
  }, [currencySymbol]);
  
  // Convert prices to heatmap cells
  const convertToHeatmapCells = useCallback((prices: CryptoPrice[]): HeatmapCell[] => {
    return prices
      .filter((p) => p.current_price > 0)
      .sort((a, b) => a.market_cap_rank - b.market_cap_rank)
      .slice(0, 100)
      .map((price) => ({
        symbol: price.symbol.toUpperCase(),
        name: price.name,
        price: price.current_price,
        change24h: price.price_change_percentage_24h || 0,
        marketCap: price.market_cap,
        volume24h: price.total_volume || 0,
        rank: price.market_cap_rank,
        image: price.image,
      }));
  }, []);
  
  // Calculate market stats
  useEffect(() => {
    const validPrices = prices.filter((p) => p.current_price > 0);
    const gainers = validPrices.filter((p) => (p.price_change_percentage_24h || 0) > 0).length;
    const losers = validPrices.filter((p) => (p.price_change_percentage_24h || 0) < 0).length;
    const unchanged = validPrices.length - gainers - losers;
    setStats({ gainers, losers, unchanged });
  }, [prices]);
  
  // Initialize heatmap animator
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = isExpanded ? 500 : 300;
      
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      if (animatorRef.current) {
        animatorRef.current.resize(width, height);
      } else {
        animatorRef.current = createHeatmapAnimator(canvas, {
          width,
          height,
          cellPadding: 2,
          borderRadius: 4,
          fontSize: isExpanded ? 11 : 9,
          maxIntensity: 8,
          showIcons: true,
          showVolume: isExpanded,
        });
        animatorRef.current?.start();
      }
    };
    
    updateDimensions();
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
      animatorRef.current?.stop();
      animatorRef.current = null;
    };
  }, [isExpanded]);
  
  // Update data when prices change
  useEffect(() => {
    if (animatorRef.current && prices.length > 0) {
      const cells = convertToHeatmapCells(prices);
      cellsRef.current = cells;
      animatorRef.current.updateData(cells);
    }
  }, [prices, convertToHeatmapCells]);
  
  // Calculate which cell is at a given position
  const getCellAtPosition = useCallback(
    (clientX: number, clientY: number): HeatmapCell | null => {
      const canvas = canvasRef.current;
      if (!canvas || cellsRef.current.length === 0) return null;
      
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      const cells = cellsRef.current;
      const aspectRatio = rect.width / rect.height;
      const cols = Math.ceil(Math.sqrt(cells.length * aspectRatio));
      const rows = Math.ceil(cells.length / cols);
      const cellWidth = rect.width / cols;
      const cellHeight = rect.height / rows;
      
      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);
      const index = row * cols + col;
      
      if (index >= 0 && index < cells.length) {
        return cells[index];
      }
      return null;
    },
    []
  );
  
  // Handle mouse move for tooltip
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getCellAtPosition(event.clientX, event.clientY);
      if (cell) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          setTooltip({
            cell,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      } else {
        setTooltip(null);
      }
    },
    [getCellAtPosition]
  );
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);
  
  // Handle canvas click for crypto selection
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSelectCrypto) return;
      const cell = getCellAtPosition(event.clientX, event.clientY);
      if (cell) {
        onSelectCrypto(cell.symbol);
      }
    },
    [getCellAtPosition, onSelectCrypto]
  );
  
  // Format change with sign
  const formatChange = (change: number): string => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };
  
  return (
    <Card className="border-border bg-card/95 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Grid3X3 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base sm:text-lg">Market Heatmap</CardTitle>
          <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
            Top 100
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-success">
              <TrendingUp className="h-3.5 w-3.5" />
              {stats.gainers}
            </span>
            <span className="flex items-center gap-1 text-destructive">
              <TrendingDown className="h-3.5 w-3.5" />
              {stats.losers}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <div
          ref={containerRef}
          className="relative w-full rounded-lg overflow-hidden"
          style={{ minHeight: isExpanded ? 500 : 300 }}
        >
          {loading && prices.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Loading market data...</span>
              </div>
            </div>
          ) : null}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full cursor-pointer transition-opacity duration-300"
            style={{ opacity: loading && prices.length === 0 ? 0.3 : 1 }}
          />
          
          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: Math.min(tooltip.x + 10, (containerRef.current?.offsetWidth || 300) - 200),
                top: Math.max(tooltip.y - 120, 10),
              }}
            >
              <div className="bg-popover/95 backdrop-blur-md border border-border rounded-lg shadow-xl p-3 min-w-[180px]">
                <div className="flex items-center gap-2 mb-2">
                  {tooltip.cell.image && (
                    <img 
                      src={tooltip.cell.image} 
                      alt={tooltip.cell.symbol}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <span className="font-bold text-foreground">{tooltip.cell.symbol}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    #{tooltip.cell.rank}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-2">{tooltip.cell.name}</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-medium text-foreground">{formatPrice(tooltip.cell.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">24h:</span>
                    <span className={`font-medium ${tooltip.cell.change24h >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatChange(tooltip.cell.change24h)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volume:</span>
                    <span className="font-medium text-foreground">{formatLargeNumber(tooltip.cell.volume24h)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MCap:</span>
                    <span className="font-medium text-foreground">{formatLargeNumber(tooltip.cell.marketCap)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-gradient-to-r from-red-700 to-red-500" />
              Bearish
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-gradient-to-r from-green-800 to-green-500" />
              Bullish
            </span>
          </div>
          <span className="opacity-70">Click any cell to view details</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default GPUHeatmap;
