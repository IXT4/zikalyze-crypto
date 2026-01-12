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

// Individual rolling digit component with proper animation tracking
const RollingDigit = memo(({ 
  digit, 
  index,
  direction 
}: { 
  digit: string; 
  index: number;
  direction: "up" | "down" | null;
}) => {
  const [displayDigit, setDisplayDigit] = useState(digit);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animDir, setAnimDir] = useState<"up" | "down" | null>(null);
  const prevDigitRef = useRef(digit);
  const animationKey = useRef(0);

  useEffect(() => {
    if (digit !== prevDigitRef.current && /\d/.test(digit) && /\d/.test(prevDigitRef.current)) {
      const oldNum = parseInt(prevDigitRef.current);
      const newNum = parseInt(digit);
      const dir = newNum > oldNum ? "up" : "down";
      
      animationKey.current += 1;
      setAnimDir(dir);
      setIsAnimating(true);
      setDisplayDigit(digit);
      prevDigitRef.current = digit;
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setAnimDir(null);
      }, 250);
      
      return () => clearTimeout(timer);
    } else if (digit !== prevDigitRef.current) {
      setDisplayDigit(digit);
      prevDigitRef.current = digit;
    }
  }, [digit]);

  // Non-numeric characters don't animate
  if (!/\d/.test(displayDigit)) {
    return <span className="inline-block tabular-nums">{displayDigit}</span>;
  }

  return (
    <span 
      key={`${index}-${animationKey.current}`}
      className={cn(
        "inline-block relative tabular-nums",
        isAnimating && animDir === "up" && "animate-roll-up text-success",
        isAnimating && animDir === "down" && "animate-roll-down text-destructive",
        !isAnimating && "text-foreground"
      )}
      style={{ 
        minWidth: "0.55em",
        transition: "color 0.3s ease-out",
      }}
    >
      {displayDigit}
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
  const [displayChars, setDisplayChars] = useState(formattedPrice.split(''));
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef<number>(value);
  const prevFormattedRef = useRef(formattedPrice);

  useEffect(() => {
    const newChars = formattedPrice.split('');
    
    if (value !== prevValueRef.current) {
      const newDirection = value > prevValueRef.current ? "up" : "down";
      setDirection(newDirection);
      setDisplayChars(newChars);
      prevValueRef.current = value;
      prevFormattedRef.current = formattedPrice;
      
      const timeout = setTimeout(() => {
        setDirection(null);
      }, 300);
      
      return () => clearTimeout(timeout);
    } else if (formattedPrice !== prevFormattedRef.current) {
      setDisplayChars(newChars);
      prevFormattedRef.current = formattedPrice;
    }
  }, [formattedPrice, value]);

  return (
    <span className={cn("tabular-nums inline-flex items-baseline", className)}>
      {displayChars.map((char, index) => (
        <RollingDigit 
          key={index} 
          index={index}
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
