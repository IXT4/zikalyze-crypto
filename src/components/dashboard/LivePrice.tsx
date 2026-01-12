// ═══════════════════════════════════════════════════════════════════════════════
// 💹 LivePrice — Real-Time Price Display with Color Transitions
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface LivePriceProps {
  value: number;
  className?: string;
}

// Large ticker display - smooth counting with color indication
export const LivePriceLarge = ({ value, className }: LivePriceProps) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(value);
  const isFirstRender = useRef(true);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Skip animation on first render to prevent aggressive jumps on page load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const startValue = prevValueRef.current;
    const diff = value - startValue;

    // Only animate meaningful changes (>0.5% to prevent micro-jitter)
    if (Math.abs(diff / startValue) < 0.005 || startValue === 0) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    setDirection(diff > 0 ? "up" : "down");

    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(startValue + diff * easeOut);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        prevValueRef.current = value;
        timeoutRef.current = setTimeout(() => setDirection(null), 300);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return (
    <span
      className={cn(
        "text-lg font-bold tabular-nums transition-colors duration-300",
        direction === "up" && "text-success",
        direction === "down" && "text-destructive",
        !direction && "text-foreground",
        className
      )}
    >
      {formatPrice(displayValue)}
    </span>
  );
};

// Compact version for tables - simple color transition
export const LivePriceCompact = ({ value, className }: LivePriceProps) => {
  const { formatPrice } = useCurrency();
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(value);
  const isFirstRender = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevValueRef.current = value;
      return;
    }

    const diff = value - prevValueRef.current;
    // Only animate meaningful changes (>0.5%)
    const threshold = prevValueRef.current * 0.005;

    if (Math.abs(diff) > threshold && prevValueRef.current !== 0) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      setDirection(diff > 0 ? "up" : "down");
      prevValueRef.current = value;
      
      timeoutRef.current = setTimeout(() => setDirection(null), 300);
    } else {
      prevValueRef.current = value;
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return (
    <span
      className={cn(
        "text-sm font-medium tabular-nums transition-colors duration-300",
        direction === "up" && "text-success",
        direction === "down" && "text-destructive",
        !direction && "text-foreground",
        className
      )}
    >
      {formatPrice(value)}
    </span>
  );
};

// Default export
export const LivePrice = ({ value, className }: LivePriceProps) => {
  return <LivePriceLarge value={value} className={className} />;
};

export default LivePrice;
