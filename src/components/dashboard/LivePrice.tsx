// ═══════════════════════════════════════════════════════════════════════════════
// 💹 LivePrice — Smooth Tick-by-Tick Real-Time Price Animation
// ═══════════════════════════════════════════════════════════════════════════════
// Professional animated price transitions with flash effects
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface LivePriceProps {
  value: number;
  className?: string;
}

// Fast smooth number animation hook optimized for tick-by-tick streaming
const useAnimatedPrice = (targetValue: number, duration: number = 150) => {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef<number>(targetValue);
  const targetValueRef = useRef<number>(targetValue);

  useEffect(() => {
    targetValueRef.current = targetValue;
  }, [targetValue]);

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    
    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    
    // Fast ease-out for snappy updates
    const easeOut = 1 - Math.pow(1 - progress, 2);
    
    const currentValue = startValueRef.current + 
      (targetValueRef.current - startValueRef.current) * easeOut;
    
    setDisplayValue(currentValue);
    
    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [duration]);

  useEffect(() => {
    // Skip animation for initial render or invalid values
    if (targetValue <= 0) return;
    
    // Start animation from current display value
    startValueRef.current = displayValue;
    startTimeRef.current = 0;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, animate]);

  return displayValue;
};

// Flash effect hook
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

    if (!value || value <= 0 || value === prevValueRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value > prevValueRef.current!) {
      setFlashClass("price-flash-up");
    } else if (value < prevValueRef.current!) {
      setFlashClass("price-flash-down");
    }

    timeoutRef.current = setTimeout(() => {
      setFlashClass(null);
    }, 800);

    prevValueRef.current = value;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return flashClass;
};

export const LivePrice = ({ value, className }: LivePriceProps) => {
  const { formatPrice } = useCurrency();
  const animatedValue = useAnimatedPrice(value, 150);
  const flashClass = useFlashEffect(value);

  return (
    <span
      className={cn(
        "price-display tabular-nums font-semibold inline-block transition-colors duration-150",
        flashClass,
        !flashClass && "text-foreground",
        className
      )}
    >
      {formatPrice(animatedValue)}
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
  const animatedValue = useAnimatedPrice(value, 120);
  const flashClass = useFlashEffect(value);

  return (
    <span
      className={cn(
        "price-display inline-block tabular-nums text-sm font-medium px-1 rounded transition-colors duration-150",
        flashClass,
        !flashClass && "text-foreground bg-transparent",
        className
      )}
    >
      {formatPrice(animatedValue)}
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
  const animatedValue = useAnimatedPrice(value, 200);
  const flashClass = useFlashEffect(value);

  return (
    <span
      className={cn(
        "price-display tabular-nums text-lg font-bold inline-block transition-colors duration-150",
        flashClass,
        !flashClass && "text-foreground",
        className
      )}
    >
      {formatPrice(animatedValue)}
    </span>
  );
};

export default LivePrice;
