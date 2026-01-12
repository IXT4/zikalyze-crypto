// ═══════════════════════════════════════════════════════════════════════════════
// 💹 RollingPrice — Binance Futures Style Digit Rolling Animation
// ═══════════════════════════════════════════════════════════════════════════════
// Each digit rolls up or down when price changes for visible real-time updates
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface RollingPriceProps {
  value: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Single rolling digit component
const RollingDigit = memo(({ 
  digit, 
  direction,
  isAnimating 
}: { 
  digit: string; 
  direction: "up" | "down" | "none";
  isAnimating: boolean;
}) => {
  const isNumber = /\d/.test(digit);
  
  if (!isNumber) {
    // Non-numeric characters (., $, ,) don't animate
    return (
      <span className="inline-block">{digit}</span>
    );
  }

  return (
    <span className="inline-block relative overflow-hidden h-[1.2em]">
      <span
        className={cn(
          "inline-block transition-transform duration-200 ease-out",
          isAnimating && direction === "up" && "animate-roll-up",
          isAnimating && direction === "down" && "animate-roll-down"
        )}
        style={{
          display: "block",
        }}
      >
        {digit}
      </span>
    </span>
  );
});

RollingDigit.displayName = "RollingDigit";

// Hook to track price direction and trigger animations
const usePriceAnimation = (value: number) => {
  const [direction, setDirection] = useState<"up" | "down" | "none">("none");
  const [isAnimating, setIsAnimating] = useState(false);
  const [flashClass, setFlashClass] = useState<string | null>(null);
  const prevValueRef = useRef<number>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      prevValueRef.current = value;
      return;
    }

    if (!value || value <= 0 || value === prevValueRef.current) return;

    // Determine direction
    const newDirection = value > prevValueRef.current ? "up" : "down";
    
    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);

    // Trigger animation
    setDirection(newDirection);
    setIsAnimating(false);
    
    // Small delay to reset animation
    requestAnimationFrame(() => {
      setIsAnimating(true);
      setFlashClass(newDirection === "up" ? "text-green-400" : "text-red-400");
    });

    // Reset animation state
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 300);

    // Reset color after flash
    flashTimeoutRef.current = setTimeout(() => {
      setFlashClass(null);
    }, 800);

    prevValueRef.current = value;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [value]);

  return { direction, isAnimating, flashClass };
};

export const RollingPrice = ({ value, className, size = "md" }: RollingPriceProps) => {
  const { formatPrice } = useCurrency();
  const { direction, isAnimating, flashClass } = usePriceAnimation(value);
  
  const formattedPrice = formatPrice(value);
  const digits = formattedPrice.split("");

  const sizeClasses = {
    sm: "text-sm font-medium",
    md: "text-base font-semibold",
    lg: "text-lg font-bold",
  };

  return (
    <span
      className={cn(
        "inline-flex tabular-nums transition-colors duration-300",
        sizeClasses[size],
        flashClass || "text-foreground",
        className
      )}
    >
      {digits.map((digit, index) => (
        <RollingDigit
          key={`${index}-${digit}`}
          digit={digit}
          direction={direction}
          isAnimating={isAnimating}
        />
      ))}
    </span>
  );
};

// Compact version for tables/lists
export const RollingPriceCompact = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  return <RollingPrice value={value} className={className} size="sm" />;
};

// Large version for hero displays
export const RollingPriceLarge = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  return <RollingPrice value={value} className={className} size="lg" />;
};

export default RollingPrice;
