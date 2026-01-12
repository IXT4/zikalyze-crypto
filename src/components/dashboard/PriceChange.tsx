// ═══════════════════════════════════════════════════════════════════════════════
// 📈 PriceChange — Smooth Animated Percentage Change Display
// ═══════════════════════════════════════════════════════════════════════════════
// Decentralized price data with smooth tick-by-tick animations
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";

// Smooth number animation hook
const useAnimatedValue = (targetValue: number, duration: number = 300) => {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef<number>(targetValue);
  const isFirstRender = useRef(true);
  const targetRef = useRef(targetValue);
  const displayRef = useRef(displayValue);

  // Keep refs in sync
  targetRef.current = targetValue;
  displayRef.current = displayValue;

  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayValue(targetValue);
      return;
    }
    
    // Start animation from current display value
    startValueRef.current = displayRef.current;
    startTimeRef.current = 0;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValueRef.current + 
        (targetRef.current - startValueRef.current) * easeOut;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration]);

  return displayValue;
};

// Enhanced flash effect hook - more sensitive for visible real-time updates
const useFlashEffect = (value: number) => {
  const [flashClass, setFlashClass] = useState<string | null>(null);
  const prevValueRef = useRef<number | undefined>(undefined);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      prevValueRef.current = value;
      return;
    }

    if (prevValueRef.current === undefined || value === prevValueRef.current) return;

    // Flash on any visible change (0.01% threshold)
    const change = Math.abs(value - prevValueRef.current);
    if (change < 0.01) {
      prevValueRef.current = value;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setFlashClass(value > prevValueRef.current ? "change-flash-up" : "change-flash-down");

    timeoutRef.current = setTimeout(() => {
      setFlashClass(null);
    }, 500);

    prevValueRef.current = value;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return flashClass;
};

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
  const animatedValue = useAnimatedValue(value, 250);
  const flashClass = useFlashEffect(value);
  
  const isPositive = animatedValue > 0;
  const isNegative = animatedValue < 0;
  const absValue = Math.abs(animatedValue);
  
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
        "inline-flex items-center font-medium transition-all duration-200",
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
        flashClass,
        className
      )}
    >
      {showIcon && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full transition-transform duration-200",
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
  const animatedValue = useAnimatedValue(value, 200);
  const flashClass = useFlashEffect(value);
  
  const isPositive = animatedValue > 0;
  const isNegative = animatedValue < 0;
  const absValue = Math.abs(animatedValue);
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 text-sm font-medium tabular-nums transition-colors duration-150",
        isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground",
        flashClass,
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
  const animatedValue = useAnimatedValue(value, 350);
  const flashClass = useFlashEffect(value);
  
  const isPositive = animatedValue > 0;
  const isNegative = animatedValue < 0;
  const absValue = Math.abs(animatedValue);
  
  const colors = isPositive
    ? "text-success bg-success/10 border-success/20"
    : isNegative
    ? "text-destructive bg-destructive/10 border-destructive/20"
    : "text-muted-foreground bg-muted/50 border-border";
  
  const Icon = isPositive ? ChevronUp : isNegative ? ChevronDown : Minus;
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 border font-semibold transition-all duration-200",
        colors,
        flashClass,
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
