// ═══════════════════════════════════════════════════════════════════════════════
// 📈 PriceChange — CoinMarketCap-Style Price Movement Display
// ═══════════════════════════════════════════════════════════════════════════════
// Decentralized price data with CMC-style visual feedback
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";

interface PriceChangeProps {
  value: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showBadge?: boolean;
  animated?: boolean;
  className?: string;
}

export const PriceChange = ({
  value,
  size = "md",
  showIcon = true,
  showBadge = true,
  animated = true,
  className,
}: PriceChangeProps) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;
  const absValue = Math.abs(value);
  
  // Size configurations
  const sizeConfig = {
    sm: {
      text: "text-xs",
      icon: "w-3 h-3",
      padding: "px-1.5 py-0.5",
      gap: "gap-0.5",
    },
    md: {
      text: "text-sm",
      icon: "w-4 h-4",
      padding: "px-2 py-1",
      gap: "gap-1",
    },
    lg: {
      text: "text-base",
      icon: "w-5 h-5",
      padding: "px-3 py-1.5",
      gap: "gap-1.5",
    },
  };
  
  const config = sizeConfig[size];
  
  // Color configurations
  const colorConfig = {
    positive: {
      text: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
      iconBg: "bg-success/20",
    },
    negative: {
      text: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/20",
      iconBg: "bg-destructive/20",
    },
    neutral: {
      text: "text-muted-foreground",
      bg: "bg-muted/50",
      border: "border-border",
      iconBg: "bg-muted",
    },
  };
  
  const colors = isPositive ? colorConfig.positive : isNegative ? colorConfig.negative : colorConfig.neutral;
  
  const Icon = isPositive ? ChevronUp : isNegative ? ChevronDown : Minus;
  
  return (
    <div
      className={cn(
        "inline-flex items-center font-medium transition-all duration-300",
        config.gap,
        config.text,
        colors.text,
        showBadge && [
          "rounded-lg",
          config.padding,
          colors.bg,
          "border",
          colors.border,
        ],
        animated && isPositive && "animate-bounce-subtle-up",
        animated && isNegative && "animate-bounce-subtle-down",
        className
      )}
    >
      {showIcon && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            colors.iconBg,
            size === "sm" ? "p-0.5" : "p-1"
          )}
        >
          <Icon className={cn(config.icon, "stroke-[3]")} />
        </span>
      )}
      <span className="font-semibold tabular-nums">
        {isPositive && "+"}
        {absValue.toFixed(2)}%
      </span>
    </div>
  );
};

// Compact version for tables and lists
export const PriceChangeCompact = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-medium tabular-nums transition-colors",
        isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground",
        className
      )}
    >
      {isPositive ? (
        <ChevronUp className="w-4 h-4 stroke-[2.5]" />
      ) : isNegative ? (
        <ChevronDown className="w-4 h-4 stroke-[2.5]" />
      ) : (
        <Minus className="w-4 h-4" />
      )}
      {absValue.toFixed(2)}%
    </div>
  );
};

// Large display for hero sections
export const PriceChangeHero = ({
  value,
  label = "24h",
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  const colors = isPositive
    ? "text-success bg-success/10 border-success/20"
    : isNegative
    ? "text-destructive bg-destructive/10 border-destructive/20"
    : "text-muted-foreground bg-muted/50 border-border";
  
  const Icon = isPositive ? ChevronUp : isNegative ? ChevronDown : Minus;
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 border font-semibold transition-all",
        colors,
        className
      )}
    >
      <div className="flex items-center gap-1">
        <Icon className="w-6 h-6 stroke-[2.5]" />
        <span className="text-xl tabular-nums">
          {isPositive && "+"}
          {absValue.toFixed(2)}%
        </span>
      </div>
      <span className="text-xs opacity-70 uppercase tracking-wide">{label}</span>
    </div>
  );
};

export default PriceChange;
