// ═══════════════════════════════════════════════════════════════════════════════
// 🎰 RollingPrice — Professional Trading-Style Price Animation
// ═══════════════════════════════════════════════════════════════════════════════
// Smooth, professional digit rolling with subtle flash effects
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

// Single rolling digit with smooth animation
const RollingDigit = ({ 
  digit, 
  prevDigit,
  isAnimating,
  direction,
}: { 
  digit: string; 
  prevDigit: string;
  isAnimating: boolean;
  direction: "up" | "down";
}) => {
  const isNumber = /\d/.test(digit);
  
  // Non-numeric characters display without animation
  if (!isNumber) {
    return (
      <span className="inline-flex items-center justify-center text-inherit">
        {digit}
      </span>
    );
  }

  return (
    <span className="relative inline-flex h-[1.15em] w-[0.62em] overflow-hidden">
      {/* Previous digit - slides out */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center will-change-transform",
          isAnimating && (direction === "up" ? "animate-digit-out-up" : "animate-digit-out-down")
        )}
        style={{ 
          opacity: isAnimating ? undefined : 0,
        }}
      >
        {prevDigit}
      </span>
      
      {/* Current digit - slides in */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center will-change-transform",
          isAnimating && (direction === "up" ? "animate-digit-in-up" : "animate-digit-in-down")
        )}
      >
        {digit}
      </span>
    </span>
  );
};

interface RollingPriceProps {
  value: number;
  className?: string;
}

export const RollingPrice = ({
  value,
  className,
}: RollingPriceProps) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [flashState, setFlashState] = useState<"up" | "down" | "fade" | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => {
    if (!value || value <= 0 || value === displayValue) return;
    
    clearTimeouts();

    const newDirection = value > displayValue ? "up" : "down";
    setDirection(newDirection);
    setPrevValue(displayValue);
    setDisplayValue(value);
    setIsAnimating(true);
    setFlashState(newDirection);

    // Phase 1: Flash peak (immediate)
    // Phase 2: Fade out flash (after 600ms)
    timeoutsRef.current.push(
      setTimeout(() => setFlashState("fade"), 600)
    );
    
    // Phase 3: Clear flash (after 1000ms)
    timeoutsRef.current.push(
      setTimeout(() => setFlashState(null), 1000)
    );

    // Clear animation state
    timeoutsRef.current.push(
      setTimeout(() => setIsAnimating(false), 320)
    );

    return clearTimeouts;
  }, [value, displayValue]);

  const currentFormatted = formatPrice(displayValue);
  const prevFormatted = formatPrice(prevValue);
  const maxLen = Math.max(currentFormatted.length, prevFormatted.length);
  const paddedCurrent = currentFormatted.padStart(maxLen, " ").split("");
  const paddedPrev = prevFormatted.padStart(maxLen, " ").split("");

  // Identify changed digits
  const changedIndices = new Set<number>();
  if (isAnimating) {
    for (let i = 0; i < maxLen; i++) {
      if (paddedCurrent[i] !== paddedPrev[i]) {
        changedIndices.add(i);
      }
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono tabular-nums font-semibold transition-all",
        flashState === "up" && "text-success",
        flashState === "down" && "text-destructive", 
        flashState === "fade" && "text-foreground transition-colors duration-400",
        !flashState && "text-foreground",
        className
      )}
    >
      {paddedCurrent.map((char, idx) => (
        <RollingDigit
          key={idx}
          digit={char}
          prevDigit={paddedPrev[idx] || char}
          isAnimating={changedIndices.has(idx)}
          direction={direction}
        />
      ))}
    </span>
  );
};

// Compact version for tables with background flash
export const RollingPriceCompact = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [flashState, setFlashState] = useState<"up" | "down" | "fade" | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => {
    if (!value || value <= 0 || value === displayValue) return;
    
    clearTimeouts();

    const newDirection = value > displayValue ? "up" : "down";
    setDirection(newDirection);
    setPrevValue(displayValue);
    setDisplayValue(value);
    setIsAnimating(true);
    setFlashState(newDirection);

    timeoutsRef.current.push(
      setTimeout(() => setFlashState("fade"), 500)
    );
    
    timeoutsRef.current.push(
      setTimeout(() => setFlashState(null), 800)
    );

    timeoutsRef.current.push(
      setTimeout(() => setIsAnimating(false), 280)
    );

    return clearTimeouts;
  }, [value, displayValue]);

  const currentFormatted = formatPrice(displayValue);
  const prevFormatted = formatPrice(prevValue);
  const maxLen = Math.max(currentFormatted.length, prevFormatted.length);
  const paddedCurrent = currentFormatted.padStart(maxLen, " ").split("");
  const paddedPrev = prevFormatted.padStart(maxLen, " ").split("");

  const changedIndices = new Set<number>();
  if (isAnimating) {
    for (let i = 0; i < maxLen; i++) {
      if (paddedCurrent[i] !== paddedPrev[i]) {
        changedIndices.add(i);
      }
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono tabular-nums text-sm font-medium rounded-md px-1.5 py-0.5 transition-all",
        flashState === "up" && "text-success bg-success/20",
        flashState === "down" && "text-destructive bg-destructive/20",
        flashState === "fade" && "text-foreground bg-transparent transition-all duration-300",
        !flashState && "text-foreground bg-transparent",
        className
      )}
    >
      {paddedCurrent.map((char, idx) => (
        <RollingDigit
          key={idx}
          digit={char}
          prevDigit={paddedPrev[idx] || char}
          isAnimating={changedIndices.has(idx)}
          direction={direction}
        />
      ))}
    </span>
  );
};

// Large ticker display with prominent effects
export const RollingPriceLarge = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [flashState, setFlashState] = useState<"up" | "down" | "fade" | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => {
    if (!value || value <= 0 || value === displayValue) return;
    
    clearTimeouts();

    const newDirection = value > displayValue ? "up" : "down";
    setDirection(newDirection);
    setPrevValue(displayValue);
    setDisplayValue(value);
    setIsAnimating(true);
    setFlashState(newDirection);

    timeoutsRef.current.push(
      setTimeout(() => setFlashState("fade"), 700)
    );
    
    timeoutsRef.current.push(
      setTimeout(() => setFlashState(null), 1100)
    );

    timeoutsRef.current.push(
      setTimeout(() => setIsAnimating(false), 350)
    );

    return clearTimeouts;
  }, [value, displayValue]);

  const currentFormatted = formatPrice(displayValue);
  const prevFormatted = formatPrice(prevValue);
  const maxLen = Math.max(currentFormatted.length, prevFormatted.length);
  const paddedCurrent = currentFormatted.padStart(maxLen, " ").split("");
  const paddedPrev = prevFormatted.padStart(maxLen, " ").split("");

  const changedIndices = new Set<number>();
  if (isAnimating) {
    for (let i = 0; i < maxLen; i++) {
      if (paddedCurrent[i] !== paddedPrev[i]) {
        changedIndices.add(i);
      }
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono tabular-nums text-lg font-bold transition-all",
        flashState === "up" && "text-success",
        flashState === "down" && "text-destructive",
        flashState === "fade" && "text-foreground transition-colors duration-400",
        !flashState && "text-foreground",
        className
      )}
    >
      {paddedCurrent.map((char, idx) => (
        <RollingDigit
          key={idx}
          digit={char}
          prevDigit={paddedPrev[idx] || char}
          isAnimating={changedIndices.has(idx)}
          direction={direction}
        />
      ))}
    </span>
  );
};

export default RollingPrice;
