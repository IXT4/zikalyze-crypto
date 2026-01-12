// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ GPUPriceChart — React Component for GPU-Accelerated Price Charts
// ═══════════════════════════════════════════════════════════════════════════════
// Uses WebGPU/WebGL2/Canvas2D for 60+ FPS smooth rendering
// Integrates with existing oracle data hooks
// Features: Glow effects, flash animations, cubic spline interpolation
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect, useState, useCallback, memo } from "react";
import { Zap, Cpu, Activity } from "lucide-react";
import { useDecentralizedChartData } from "@/hooks/useDecentralizedChartData";
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

interface GPUPriceChartProps {
  crypto: string;
  change24h?: number;
  height?: number;
  showControls?: boolean;
  className?: string;
}

const BackendBadge = memo(({ backend }: { backend: RenderBackend }) => {
  const labels: Record<RenderBackend, { label: string; color: string }> = {
    webgpu: { label: "WebGPU", color: "bg-emerald-500/20 text-emerald-400" },
    webgl2: { label: "WebGL2", color: "bg-blue-500/20 text-blue-400" },
    canvas2d: { label: "Canvas", color: "bg-amber-500/20 text-amber-400" },
  };
  
  const { label, color } = labels[backend];
  
  return (
    <span className={cn("flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", color)}>
      <Cpu className="h-3 w-3" />
      {label}
    </span>
  );
});

BackendBadge.displayName = "BackendBadge";

const GPUPriceChart = ({
  crypto,
  change24h,
  height = 256,
  showControls = true,
  className,
}: GPUPriceChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<GPUChartInstance | null>(null);
  const [backend, setBackend] = useState<RenderBackend | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height });
  
  const {
    chartData,
    priceChange,
    isBuilding,
    isLive,
    currentSource,
    oracleStatus,
    dataPointCount,
  } = useDecentralizedChartData(crypto);
  
  const displayChange = change24h ?? priceChange;
  const isPositive = displayChange >= 0;
  
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
  
  // Update chart data
  useEffect(() => {
    if (!chartManagerRef.current || chartData.length < 2) return;
    
    // Convert to ChartDataPoint format
    const gpuData: ChartDataPoint[] = chartData.map((point) => ({
      timestamp: new Date().getTime() - (chartData.length - chartData.indexOf(point)) * 1000,
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
    <div className={cn("rounded-2xl border border-border bg-card p-6", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">GPU Chart</h3>
          <OracleSourceBadge source={activeSource} />
          {backend && <BackendBadge backend={backend} />}
          {isLive && <LiveBadge />}
        </div>
        
        <div className="flex items-center gap-3">
          <OracleConnectionDots status={oracleStatus} />
          {chartData.length > 0 && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-medium",
                  isPositive ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                )}
              >
                {isPositive ? "+" : ""}
                {displayChange.toFixed(2)}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                {change24h !== undefined ? "24h" : "session"}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Chart Container */}
      <div 
        ref={containerRef} 
        className="relative"
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
      
      {/* Controls */}
      {showControls && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3" />
            <span>{chartData.length} data points</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerManualFlash("up")}
              className="rounded bg-success/20 px-2 py-1 text-success hover:bg-success/30 transition-colors"
            >
              Test Flash ↑
            </button>
            <button
              onClick={() => triggerManualFlash("down")}
              className="rounded bg-destructive/20 px-2 py-1 text-destructive hover:bg-destructive/30 transition-colors"
            >
              Test Flash ↓
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(GPUPriceChart);
