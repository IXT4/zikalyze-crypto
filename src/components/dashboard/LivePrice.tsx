// ═══════════════════════════════════════════════════════════════════════════════
// 💹 LivePrice — Rolling Digit Animation for Real-Time Prices
// ═══════════════════════════════════════════════════════════════════════════════
// CoinMarketCap-style rolling digits with smooth number transitions
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface LivePriceProps {
  value: number;
  className?: string;
}

// Individual rolling digit component
const RollingDigit = memo(({ 
  digit, 
  direction 
}: { 
  digit: string; 
  direction: "up" | "down" | null;
}) => {
  const [currentDigit, setCurrentDigit] = useState(digit);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animDirection, setAnimDirection] = useState<"up" | "down" | null>(null);
  const prevDigitRef = useRef(digit);

  useEffect(() => {
    if (digit !== prevDigitRef.current) {
      setAnimDirection(direction);
      setIsAnimating(true);
      
      // Update digit after animation starts
      const updateTimer = setTimeout(() => {
        setCurrentDigit(digit);
        prevDigitRef.current = digit;
      }, 50);
      
      // Clear animation state
      const clearTimer = setTimeout(() => {
        setIsAnimating(false);
        setAnimDirection(null);
      }, 300);
      
      return () => {
        clearTimeout(updateTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [digit, direction]);

  // Non-numeric characters don't animate
  if (!/\d/.test(digit)) {
    return <span className="inline-block">{digit}</span>;
  }

  return (
    <span 
      className={cn(
        "inline-block relative overflow-hidden",
        isAnimating && animDirection === "up" && "animate-roll-up",
        isAnimating && animDirection === "down" && "animate-roll-down"
      )}
      style={{ 
        minWidth: "0.6em",
        transition: "color 0.3s ease-out",
      }}
    >
      <span 
        className={cn(
          "inline-block tabular-nums",
          isAnimating && animDirection === "up" && "text-success",
          isAnimating && animDirection === "down" && "text-destructive"
        )}
      >
        {currentDigit}
      </span>
    </span>
  );
});

RollingDigit.displayName = "RollingDigit";

// Rolling price display with digit-by-digit animation
const RollingPriceDisplay = memo(({ 
  formattedPrice, 
  value,
  className 
}: { 
  formattedPrice: string;
  value: number;
  className?: string;
}) => {
  const [displayPrice, setDisplayPrice] = useState(formattedPrice);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef<number>(value);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      prevValueRef.current = value;
      setDisplayPrice(formattedPrice);
      return;
    }

    if (value !== prevValueRef.current) {
      const newDirection = value > prevValueRef.current ? "up" : "down";
      setDirection(newDirection);
      setDisplayPrice(formattedPrice);
      prevValueRef.current = value;
      
      // Clear direction after animation
      const timeout = setTimeout(() => {
        setDirection(null);
      }, 400);
      
      return () => clearTimeout(timeout);
    }
  }, [formattedPrice, value]);

  // Split price into characters for individual animation
  const characters = displayPrice.split('');

  return (
    <span className={cn("tabular-nums inline-flex", className)}>
      {characters.map((char, index) => (
        <RollingDigit 
          key={`${index}-${char}`} 
          digit={char} 
          direction={direction}
        />
      ))}
    </span>
  );
});

RollingPriceDisplay.displayName = "RollingPriceDisplay";

// Smooth counting animation for large price changes
const AnimatedValue = memo(({ 
  value, 
  formatFn,
  className,
  duration = 300
}: { 
  value: number;
  formatFn: (v: number) => string;
  className?: string;
  duration?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const animationRef = useRef<number | null>(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = prevValueRef.current;
    const endValue = value;
    const diff = endValue - startValue;
    
    if (Math.abs(diff) < 0.0000001) return;
    
    setDirection(diff > 0 ? "up" : "down");
    
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + diff * easeOut;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
        
        // Clear direction after settling
        setTimeout(() => setDirection(null), 200);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue = useMemo(() => formatFn(displayValue), [formatFn, displayValue]);

  return (
    <span 
      className={cn(
        "tabular-nums transition-colors duration-300",
        direction === "up" && "text-success",
        direction === "down" && "text-destructive",
        !direction && "text-foreground",
        className
      )}
    >
      {formattedValue}
    </span>
  );
});

AnimatedValue.displayName = "AnimatedValue";

export const LivePrice = ({ value, className }: LivePriceProps) => {
  const { formatPrice } = useCurrency();

  return (
    <span className={cn("font-semibold", className)}>
      <AnimatedValue value={value} formatFn={formatPrice} duration={250} />
    </span>
  );
};

// Compact version for tables - uses rolling digits
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
    <span className={cn("text-sm font-medium", className)}>
      <RollingPriceDisplay formattedPrice={formattedPrice} value={value} />
    </span>
  );
};

// Large ticker display - uses smooth counting
export const LivePriceLarge = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const { formatPrice } = useCurrency();

  return (
    <span className={cn("text-lg font-bold", className)}>
      <AnimatedValue value={value} formatFn={formatPrice} duration={300} />
    </span>
  );
};

export default LivePrice;
