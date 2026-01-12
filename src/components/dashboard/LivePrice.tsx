// ═══════════════════════════════════════════════════════════════════════════════
// 💹 LivePrice — Rolling Digit Animation for Real-Time Prices
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface LivePriceProps {
  value: number;
  className?: string;
}

// Hook to track price direction and trigger animations - CoinMarketCap-style continuous streaming
const usePriceDirection = (value: number) => {
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [key, setKey] = useState(0);
  const prevValueRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      prevValueRef.current = value;
      return;
    }

    if (!value || value <= 0) return;
    
    // Immediate response to any price change - CoinMarketCap style
    if (value !== prevValueRef.current) {
      const now = Date.now();
      // Reduced throttle to 50ms for faster visual response
      if (now - lastUpdateRef.current > 50) {
        setDirection(value > prevValueRef.current ? "up" : "down");
        setKey(k => k + 1);
        lastUpdateRef.current = now;
        prevValueRef.current = value;
      } else {
        // Still update the reference even if we skip animation
        prevValueRef.current = value;
      }
    }
  }, [value]);

  // Auto-clear direction after flash for clean look
  useEffect(() => {
    if (direction) {
      const timeout = setTimeout(() => setDirection(null), 400);
      return () => clearTimeout(timeout);
    }
  }, [direction, key]);

  return { direction, key };
};

// Simple price display without animations
const PriceDisplay = ({ 
  formattedPrice, 
  className 
}: { 
  formattedPrice: string;
  className?: string;
}) => {
  return (
    <span className={cn("tabular-nums", className)}>
      {formattedPrice}
    </span>
  );
};

export const LivePrice = ({ value, className }: LivePriceProps) => {
  const { formatPrice } = useCurrency();
  const formattedPrice = useMemo(() => formatPrice(value), [formatPrice, value]);

  return (
    <span className={cn("font-semibold text-foreground", className)}>
      <PriceDisplay formattedPrice={formattedPrice} />
    </span>
  );
};

// Compact version for tables
export const LivePriceCompact = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const { formatPrice } = useCurrency();
  const formattedPrice = useMemo(() => formatPrice(value), [formatPrice, value]);

  return (
    <span className={cn("text-sm font-medium text-foreground", className)}>
      <PriceDisplay formattedPrice={formattedPrice} />
    </span>
  );
};

// Large ticker display
export const LivePriceLarge = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const { formatPrice } = useCurrency();
  const formattedPrice = useMemo(() => formatPrice(value), [formatPrice, value]);

  return (
    <span className={cn("text-lg font-bold text-foreground", className)}>
      <PriceDisplay formattedPrice={formattedPrice} />
    </span>
  );
};

export default LivePrice;
