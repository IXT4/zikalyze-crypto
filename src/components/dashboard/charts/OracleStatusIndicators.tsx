// ═══════════════════════════════════════════════════════════════════════════════
// 🔮 Oracle Status Indicators — Shared components for decentralized chart status
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from "@/lib/utils";
import { Zap, Link2, Radio, Layers } from "lucide-react";

type OracleSource = "Pyth" | "DIA" | "API3" | "Redstone" | "none" | null;

interface OracleStatusProps {
  pythConnected: boolean;
  diaConnected: boolean;
  api3Connected: boolean;
  redstoneConnected: boolean;
  primarySource: OracleSource;
}

const SOURCE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Pyth: { 
    icon: <Zap className="h-3 w-3" />, 
    color: "text-chart-cyan", 
    bg: "bg-chart-cyan/20" 
  },
  DIA: { 
    icon: <Radio className="h-3 w-3" />, 
    color: "text-chart-purple", 
    bg: "bg-chart-purple/20" 
  },
  API3: { 
    icon: <Link2 className="h-3 w-3" />, 
    color: "text-chart-blue", 
    bg: "bg-chart-blue/20" 
  },
  Redstone: { 
    icon: <Layers className="h-3 w-3" />, 
    color: "text-chart-orange", 
    bg: "bg-chart-orange/20" 
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
  const dots = [
    { connected: status.pythConnected, label: "Pyth", color: "bg-chart-cyan" },
    { connected: status.diaConnected, label: "DIA", color: "bg-chart-purple" },
    { connected: status.api3Connected, label: "API3", color: "bg-chart-blue" },
    { connected: status.redstoneConnected, label: "Redstone", color: "bg-chart-orange" },
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
    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
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
