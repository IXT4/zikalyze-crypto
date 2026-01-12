// ═══════════════════════════════════════════════════════════════════════════════
// 💹 LivePrice — Binance Futures Style Rolling Price Animation
// ═══════════════════════════════════════════════════════════════════════════════
// Digits visibly roll up/down when price changes for real-time feedback
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface LivePriceProps {
  value: number;
  className?: string;
}

// Single digit that rolls up or down
const RollingDigit = memo(({ 
  char, 
  prevChar,
  direction,
  shouldAnimate
}: { 
  char: string;
  prevChar: string;
  direction: "up" | "down" | "none";
  shouldAnimate: boolean;
}) => {
  const isNumber = /\d/.test(char);
  
  // Non-numeric characters don't animate
  if (!isNumber) {
    return <span className="inline-block">{char}</span>;
  }

  return (
    <span 
      className="inline-block relative overflow-hidden"
      style={{ height: '1.2em', lineHeight: '1.2em' }}
    >
      <span
        className={cn(
          "inline-block",
          shouldAnimate && direction === "up" && "animate-roll-up",
          shouldAnimate && direction === "down" && "animate-roll-down",
        )}
      >
        {char}
      </span>
    </span>
  );
});

RollingDigit.displayName = "RollingDigit";

// Hook for tracking price changes and animation state
const usePriceRoller = (value: number) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<"up" | "down" | "none">("none");
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [colorClass, setColorClass] = useState<string | null>(null);
  const prevValueRef = useRef(value);
  const prevFormattedRef = useRef("");
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const colorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    if (!value || value <= 0 || value === prevValueRef.current) return;

    const newDirection = value > prevValueRef.current ? "up" : "down";
    
    // Clear existing timeouts
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    if (colorTimeoutRef.current) {
      clearTimeout(colorTimeoutRef.current);
    }

    // Reset animation first
    setShouldAnimate(false);
    
    // Then trigger new animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDirection(newDirection);
        setShouldAnimate(true);
        setDisplayValue(value);
        setColorClass(newDirection === "up" ? "text-green-400" : "text-red-400");
      });
    });

    // Reset animation flag
    animationTimeoutRef.current = setTimeout(() => {
      setShouldAnimate(false);
    }, 300);

    // Keep color longer for visibility
    colorTimeoutRef.current = setTimeout(() => {
      setColorClass(null);
    }, 1000);

    prevValueRef.current = value;

    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (colorTimeoutRef.current) clearTimeout(colorTimeoutRef.current);
    };
  }, [value]);

  return { displayValue, direction, shouldAnimate, colorClass, prevFormatted: prevFormattedRef };
};

export const LivePrice = ({ value, className }: LivePriceProps) => {
  const { formatPrice } = useCurrency();
  const { displayValue, direction, shouldAnimate, colorClass, prevFormatted } = usePriceRoller(value);
  
  const formatted = useMemo(() => formatPrice(displayValue), [formatPrice, displayValue]);
  const chars = formatted.split("");
  const prevChars = prevFormatted.current.split("");
  
  // Update prev formatted after render
  useEffect(() => {
    prevFormatted.current = formatted;
  }, [formatted, prevFormatted]);

  return (
    <span
      className={cn(
        "inline-flex tabular-nums font-semibold transition-colors duration-300",
        colorClass || "text-foreground",
        className
      )}
    >
      {chars.map((char, i) => (
        <RollingDigit
          key={i}
          char={char}
          prevChar={prevChars[i] || char}
          direction={direction}
          shouldAnimate={shouldAnimate && char !== prevChars[i]}
        />
      ))}
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
  const { displayValue, direction, shouldAnimate, colorClass, prevFormatted } = usePriceRoller(value);
  
  const formatted = useMemo(() => formatPrice(displayValue), [formatPrice, displayValue]);
  const chars = formatted.split("");
  const prevChars = prevFormatted.current.split("");
  
  useEffect(() => {
    prevFormatted.current = formatted;
  }, [formatted, prevFormatted]);

  return (
    <span
      className={cn(
        "inline-flex tabular-nums text-sm font-medium transition-colors duration-300",
        colorClass || "text-foreground",
        className
      )}
    >
      {chars.map((char, i) => (
        <RollingDigit
          key={i}
          char={char}
          prevChar={prevChars[i] || char}
          direction={direction}
          shouldAnimate={shouldAnimate && char !== prevChars[i]}
        />
      ))}
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
  const { displayValue, direction, shouldAnimate, colorClass, prevFormatted } = usePriceRoller(value);
  
  const formatted = useMemo(() => formatPrice(displayValue), [formatPrice, displayValue]);
  const chars = formatted.split("");
  const prevChars = prevFormatted.current.split("");
  
  useEffect(() => {
    prevFormatted.current = formatted;
  }, [formatted, prevFormatted]);

  return (
    <span
      className={cn(
        "inline-flex tabular-nums text-lg font-bold transition-colors duration-300",
        colorClass || "text-foreground",
        className
      )}
    >
      {chars.map((char, i) => (
        <RollingDigit
          key={i}
          char={char}
          prevChar={prevChars[i] || char}
          direction={direction}
          shouldAnimate={shouldAnimate && char !== prevChars[i]}
        />
      ))}
    </span>
  );
};

export default LivePrice;
