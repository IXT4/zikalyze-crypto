// ═══════════════════════════════════════════════════════════════════════════════
// 🎰 RollingPrice — Airport Departure Board Style Digit Animation
// ═══════════════════════════════════════════════════════════════════════════════
// Each digit rolls independently like a mechanical flip display
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

// Single rolling digit component
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
  
  // For non-numbers (currency symbols, commas, dots), just display them
  if (!isNumber) {
    return (
      <span className="inline-flex items-center justify-center text-inherit">
        {digit}
      </span>
    );
  }

  return (
    <span className="relative inline-flex h-[1.2em] w-[0.6em] overflow-hidden">
      {/* Previous digit (rolls out) */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          isAnimating && (direction === "up" ? "animate-roll-out-up" : "animate-roll-out-down")
        )}
        style={{ 
          opacity: isAnimating ? undefined : 0,
          transform: isAnimating ? undefined : (direction === "up" ? "translateY(-100%)" : "translateY(100%)"),
        }}
      >
        {prevDigit}
      </span>
      
      {/* Current digit (rolls in) */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          isAnimating && (direction === "up" ? "animate-roll-in-up" : "animate-roll-in-down")
        )}
        style={{ 
          transform: isAnimating ? undefined : "translateY(0)",
        }}
      >
        {digit}
      </span>
    </span>
  );
};

interface RollingPriceProps {
  value: number;
  className?: string;
  showFlash?: boolean;
}

export const RollingPrice = ({
  value,
  className,
  showFlash = true,
}: RollingPriceProps) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!value || value <= 0) return;
    
    // Value changed
    if (value !== displayValue) {
      // Clear any pending animations
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }

      // Set direction and trigger animation
      const newDirection = value > displayValue ? "up" : "down";
      setDirection(newDirection);
      setPrevValue(displayValue);
      setDisplayValue(value);
      setIsAnimating(true);

      // Flash effect
      if (showFlash) {
        setFlash(newDirection);
        flashTimeoutRef.current = setTimeout(() => setFlash(null), 800);
      }

      // Clear animation state
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }

    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [value, displayValue, showFlash]);

  const currentFormatted = formatPrice(displayValue);
  const prevFormatted = formatPrice(prevValue);
  const currentChars = currentFormatted.split("");
  const prevChars = prevFormatted.split("");

  // Pad to same length
  const maxLen = Math.max(currentChars.length, prevChars.length);
  const paddedCurrent = currentFormatted.padStart(maxLen, " ").split("");
  const paddedPrev = prevFormatted.padStart(maxLen, " ").split("");

  // Find changed indices
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
        "inline-flex items-center font-mono tabular-nums font-semibold transition-colors duration-500",
        flash === "up" && "text-success",
        flash === "down" && "text-destructive",
        !flash && "text-foreground",
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

// Compact version for tables
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
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!value || value <= 0) return;
    
    if (value !== displayValue) {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);

      const newDirection = value > displayValue ? "up" : "down";
      setDirection(newDirection);
      setPrevValue(displayValue);
      setDisplayValue(value);
      setIsAnimating(true);

      setFlash(newDirection);
      flashTimeoutRef.current = setTimeout(() => setFlash(null), 700);

      animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 280);
    }

    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
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
        "inline-flex items-center font-mono tabular-nums text-sm font-medium transition-colors duration-400 rounded px-1",
        flash === "up" && "text-success bg-success/15",
        flash === "down" && "text-destructive bg-destructive/15",
        !flash && "text-foreground",
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

// Large ticker display
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
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!value || value <= 0) return;
    
    if (value !== displayValue) {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);

      const newDirection = value > displayValue ? "up" : "down";
      setDirection(newDirection);
      setPrevValue(displayValue);
      setDisplayValue(value);
      setIsAnimating(true);

      setFlash(newDirection);
      flashTimeoutRef.current = setTimeout(() => setFlash(null), 900);

      animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 320);
    }

    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
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
        "inline-flex items-center font-mono tabular-nums text-lg font-bold transition-colors duration-500",
        flash === "up" && "text-success",
        flash === "down" && "text-destructive",
        !flash && "text-foreground",
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
