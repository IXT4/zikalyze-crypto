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

const GPUHeatmap = ({ prices, loading = false, onSelectCrypto }: GPUHeatmapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animatorRef = useRef<HeatmapAnimator | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState({ gainers: 0, losers: 0, unchanged: 0 });
  
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
      animatorRef.current.updateData(cells);
    }
  }, [prices, convertToHeatmapCells]);
  
  // Handle canvas click for crypto selection
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSelectCrypto || !canvasRef.current || !containerRef.current) return;
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const validPrices = prices.filter((p) => p.current_price > 0).slice(0, 100);
      const cols = Math.ceil(Math.sqrt(validPrices.length * (rect.width / rect.height)));
      const cellWidth = rect.width / cols;
      const cellHeight = rect.height / Math.ceil(validPrices.length / cols);
      
      const col = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);
      const index = row * cols + col;
      
      if (index >= 0 && index < validPrices.length) {
        onSelectCrypto(validPrices[index].symbol.toUpperCase());
      }
    },
    [prices, onSelectCrypto]
  );
  
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
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Loading market data...</span>
              </div>
            </div>
          ) : null}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full cursor-pointer transition-opacity duration-300"
            style={{ opacity: loading && prices.length === 0 ? 0.3 : 1 }}
          />
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
