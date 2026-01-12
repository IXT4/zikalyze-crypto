// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 Oracle Status Indicators — Shared components for decentralized chart status
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from "@/lib/utils";
import { Zap, Radio } from "lucide-react";

export type OracleSource = "Pyth" | "DIA" | "Redstone" | "WebSocket" | "none" | null;

interface OracleStatusProps {
  pythConnected: boolean;
  diaConnected?: boolean;
  redstoneConnected?: boolean;
  primarySource: OracleSource;
}

const SOURCE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Pyth: { 
    icon: <Zap className="h-3 w-3" />, 
    color: "text-chart-cyan", 
    bg: "bg-chart-cyan/20" 
  },
  WebSocket: { 
    icon: <Radio className="h-3 w-3" />, 
    color: "text-red-400", 
    bg: "bg-red-400/20" 
  },
};

export const OracleSourceBadge = ({ source }: { source: OracleSource }) => {
  if (!source || source === "none") return null;
  
  const config = SOURCE_CONFIG[source];
  if (!config) return null;

  return (
    <span className={cn(
      "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
      config.bg, 
      config.color
    )}>
      {config.icon}
      {source}
    </span>
  );
};

export const OracleConnectionDots = ({ status }: { status: OracleStatusProps }) => {
  // Only show Pyth and WebSocket indicators now
  const dots = [
    { connected: status.pythConnected, label: "Pyth", color: "bg-chart-cyan" },
    { connected: status.primarySource === "WebSocket", label: "WebSocket", color: "bg-red-400" },
  ];

  return (
    <div className="flex items-center gap-1">
      {dots.map((dot) => (
        <div
          key={dot.label}
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors",
            dot.connected ? dot.color : "bg-muted-foreground/30"
          )}
          title={`${dot.label}: ${dot.connected ? "Connected" : "Disconnected"}`}
        />
      ))}
    </div>
  );
};

export const LiveBadge = () => (
  <span className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-success/20 text-success">
    <span 
      className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_1px_hsl(var(--success)/0.7)]" 
      style={{ animation: "pulse 1.5s ease-in-out infinite" }}
    />
    Live
  </span>
);

interface BuildingStateProps {
  dataPointCount: number;
  compact?: boolean;
}

export const ChartBuildingState = ({ dataPointCount, compact = false }: BuildingStateProps) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
    <div className="flex items-center gap-2">
      <Zap className={cn("text-chart-cyan animate-pulse", compact ? "h-5 w-5" : "h-6 w-6")} />
      <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
        Building from Oracle Ticks...
      </span>
    </div>
    {!compact && (
      <span className="text-xs text-muted-foreground/70">
        100% Decentralized • No Exchange APIs
      </span>
    )}
    <span className="text-[10px] text-chart-cyan/70">
      {dataPointCount} / 5 points collected
    </span>
  </div>
);

export const ChartConnectingState = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
    <Radio className={cn("text-warning animate-pulse", compact ? "h-5 w-5" : "h-8 w-8")} />
    <span className={compact ? "text-xs" : "text-sm"}>
      {compact ? "Connecting..." : "Connecting to Decentralized Oracles..."}
    </span>
  </div>
);
