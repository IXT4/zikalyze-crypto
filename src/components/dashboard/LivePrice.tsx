// ═══════════════════════════════════════════════════════════════════════════════
// 💹 LivePrice — Real-Time Price Display with Flash Animation
// ═══════════════════════════════════════════════════════════════════════════════
// Shows green flash when price goes UP, red flash when price goes DOWN
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface LivePriceProps {
  value: number;
  className?: string;
}

// Simple rolling digit with direction-based color
const RollingDigit = ({
  char,
  direction,
  isAnimating,
}: {
  char: string;
  direction: "up" | "down" | null;
  isAnimating: boolean;
}) => {
  return (
    <span
      className={cn(
        "inline-block tabular-nums transition-colors duration-300",
        isAnimating && direction === "up" && "text-success",
        isAnimating && direction === "down" && "text-destructive",
        !isAnimating && "text-foreground"
      )}
      style={{ minWidth: /\d/.test(char) ? "0.6em" : undefined }}
    >
      {char}
    </span>
  );
};

// Compact version for tables - rolling digits with flash effect
export const LivePriceCompact = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const { formatPrice } = useCurrency();
  const [displayPrice, setDisplayPrice] = useState(() => formatPrice(value));
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only animate on meaningful changes (>0.01%)
    const diff = Math.abs(value - prevValueRef.current);
    const threshold = prevValueRef.current * 0.0001;
    
    if (diff > threshold && prevValueRef.current !== 0) {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      const newDirection = value > prevValueRef.current ? "up" : "down";
      setDirection(newDirection);
      setIsAnimating(true);
      setDisplayPrice(formatPrice(value));
      prevValueRef.current = value;
      
      // Shorter animation duration
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
        setDirection(null);
      }, 300);
    } else if (formatPrice(value) !== displayPrice) {
      setDisplayPrice(formatPrice(value));
      prevValueRef.current = value;
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [value, formatPrice, displayPrice]);

  return (
    <span
      className={cn(
        "text-sm font-medium inline-flex items-baseline rounded px-1 -mx-1 transition-all duration-300",
        isAnimating && direction === "up" && "price-flash-up",
        isAnimating && direction === "down" && "price-flash-down",
        className
      )}
    >
      {displayPrice.split("").map((char, i) => (
        <RollingDigit
          key={`${i}-${char}`}
          char={char}
          direction={direction}
          isAnimating={isAnimating}
        />
      ))}
    </span>
  );
};

// Large ticker display - smooth counting with flash
export const LivePriceLarge = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const startValue = prevValueRef.current;
    const endValue = value;
    const diff = endValue - startValue;

    if (Math.abs(diff) < 0.0000001) return;

    const newDirection = diff > 0 ? "up" : "down";
    setDirection(newDirection);
    setIsAnimating(true);

    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + diff * easeOut;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
        
        timeoutRef.current = setTimeout(() => {
          setIsAnimating(false);
          setDirection(null);
        }, 300);
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
        "text-lg font-bold tabular-nums rounded px-2 -mx-2 transition-all duration-300",
        isAnimating && direction === "up" && "price-flash-up",
        isAnimating && direction === "down" && "price-flash-down",
        !isAnimating && "text-foreground",
        className
      )}
    >
      {formatPrice(displayValue)}
    </span>
  );
};

// Default export - uses AnimatedValue approach
export const LivePrice = ({ value, className }: LivePriceProps) => {
  return <LivePriceLarge value={value} className={className} />;
};

export default LivePrice;
