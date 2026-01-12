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

// Hook to track price direction and trigger animations
const usePriceDirection = (value: number) => {
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [key, setKey] = useState(0);
  const prevValueRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      prevValueRef.current = value;
      return;
    }

    if (!value || value <= 0 || value === prevValueRef.current) return;

    setDirection(value > prevValueRef.current ? "up" : "down");
    setKey(k => k + 1);
    prevValueRef.current = value;
  }, [value]);

  return { direction, key };
};

// Animated digit component
const AnimatedDigit = ({ 
  char, 
  direction, 
  animationKey 
}: { 
  char: string; 
  direction: "up" | "down" | null;
  animationKey: number;
}) => {
  const isDigit = /\d/.test(char);
  
  if (!isDigit) {
    return <span className="inline-block">{char}</span>;
  }

  return (
    <span 
      key={animationKey}
      className={cn(
        "inline-block",
        direction === "up" && "animate-[slideUp_0.5s_cubic-bezier(0.34,1.56,0.64,1)]",
        direction === "down" && "animate-[slideDown_0.5s_cubic-bezier(0.34,1.56,0.64,1)]"
      )}
    >
      {char}
    </span>
  );
};

// Rolling price display
const RollingPrice = ({ 
  formattedPrice, 
  direction, 
  animationKey,
  className 
}: { 
  formattedPrice: string;
  direction: "up" | "down" | null;
  animationKey: number;
  className?: string;
}) => {
  const chars = formattedPrice.split("");
  
  return (
    <span className={cn("tabular-nums inline-flex", className)}>
      {chars.map((char, i) => (
        <AnimatedDigit 
          key={`${i}-${char}`}
          char={char} 
          direction={direction}
          animationKey={animationKey}
        />
      ))}
    </span>
  );
};

export const LivePrice = ({ value, className }: LivePriceProps) => {
  const { formatPrice } = useCurrency();
  const { direction, key } = usePriceDirection(value);
  const formattedPrice = useMemo(() => formatPrice(value), [formatPrice, value]);

  return (
    <span
      className={cn(
        "font-semibold transition-colors duration-300",
        direction === "up" && "text-success",
        direction === "down" && "text-destructive",
        !direction && "text-foreground",
        className
      )}
    >
      <RollingPrice 
        formattedPrice={formattedPrice} 
        direction={direction} 
        animationKey={key}
      />
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
  const { direction, key } = usePriceDirection(value);
  const formattedPrice = useMemo(() => formatPrice(value), [formatPrice, value]);

  return (
    <span
      className={cn(
        "text-sm font-medium transition-colors duration-300",
        direction === "up" && "text-success",
        direction === "down" && "text-destructive",
        !direction && "text-foreground",
        className
      )}
    >
      <RollingPrice 
        formattedPrice={formattedPrice} 
        direction={direction} 
        animationKey={key}
      />
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
  const { direction, key } = usePriceDirection(value);
  const formattedPrice = useMemo(() => formatPrice(value), [formatPrice, value]);

  return (
    <span
      className={cn(
        "text-lg font-bold transition-colors duration-300",
        direction === "up" && "text-success",
        direction === "down" && "text-destructive",
        !direction && "text-foreground",
        className
      )}
    >
      <RollingPrice 
        formattedPrice={formattedPrice} 
        direction={direction} 
        animationKey={key}
      />
    </span>
  );
};

export default LivePrice;
