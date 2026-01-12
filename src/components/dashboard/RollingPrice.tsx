// ═══════════════════════════════════════════════════════════════════════════════
// 🎰 RollingPrice — Airport Departure Board Style Digit Animation
// ═══════════════════════════════════════════════════════════════════════════════
// Each digit rolls independently like a mechanical flip display
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

// Single rolling digit component
const RollingDigit = memo(({ 
  digit, 
  prevDigit,
  isAnimating 
}: { 
  digit: string; 
  prevDigit: string;
  isAnimating: boolean;
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
    <span className="relative inline-flex h-[1.2em] w-[0.65em] overflow-hidden">
      {/* Previous digit (rolls up and out) */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-transform",
          isAnimating ? "animate-roll-out-up" : ""
        )}
        style={{ 
          transform: isAnimating ? "" : "translateY(-100%)",
          opacity: isAnimating ? 1 : 0 
        }}
      >
        {prevDigit}
      </span>
      
      {/* Current digit (rolls in from bottom) */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-transform",
          isAnimating ? "animate-roll-in-up" : ""
        )}
        style={{ transform: isAnimating ? "" : "translateY(0)" }}
      >
        {digit}
      </span>
    </span>
  );
});

RollingDigit.displayName = "RollingDigit";

interface RollingPriceProps {
  value: number;
  className?: string;
  showFlash?: boolean;
}

export const RollingPrice = memo(({
  value,
  className,
  showFlash = true,
}: RollingPriceProps) => {
  const { formatPrice } = useCurrency();
  const [displayChars, setDisplayChars] = useState<string[]>([]);
  const [prevChars, setPrevChars] = useState<string[]>([]);
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!value || value <= 0) return;

    const formatted = formatPrice(value);
    const chars = formatted.split("");
    
    // First render - no animation
    if (isFirstRender.current) {
      setDisplayChars(chars);
      setPrevChars(chars);
      isFirstRender.current = false;
      prevValueRef.current = value;
      return;
    }

    // Value changed - animate differing digits
    if (value !== prevValueRef.current) {
      const prevFormatted = formatPrice(prevValueRef.current);
      const prevCharsArr = prevFormatted.split("");
      
      // Flash effect
      if (showFlash) {
        const direction = value > prevValueRef.current ? "up" : "down";
        setFlash(direction);
        setTimeout(() => setFlash(null), 400);
      }

      // Find which digits changed
      const changedIndices = new Set<number>();
      const maxLen = Math.max(chars.length, prevCharsArr.length);
      
      for (let i = 0; i < maxLen; i++) {
        if (chars[i] !== prevCharsArr[i]) {
          changedIndices.add(i);
        }
      }

      setPrevChars(prevCharsArr);
      setDisplayChars(chars);
      setAnimatingIndices(changedIndices);

      // Clear animation state after animation completes
      setTimeout(() => {
        setAnimatingIndices(new Set());
      }, 300);

      prevValueRef.current = value;
    }
  }, [value, formatPrice, showFlash]);

  // Pad arrays to same length for smooth transitions
  const maxLen = Math.max(displayChars.length, prevChars.length);
  const paddedDisplay = displayChars.join("").padStart(maxLen, " ").split("");
  const paddedPrev = prevChars.join("").padStart(maxLen, " ").split("");

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono tabular-nums font-semibold transition-colors duration-200",
        flash === "up" && "text-success",
        flash === "down" && "text-destructive",
        !flash && "text-foreground",
        className
      )}
    >
      {paddedDisplay.map((char, idx) => (
        <RollingDigit
          key={`${idx}-${paddedDisplay.length}`}
          digit={char}
          prevDigit={paddedPrev[idx] || char}
          isAnimating={animatingIndices.has(idx)}
        />
      ))}
    </span>
  );
});

RollingPrice.displayName = "RollingPrice";

// Compact version for tables
export const RollingPriceCompact = memo(({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const { formatPrice } = useCurrency();
  const [displayChars, setDisplayChars] = useState<string[]>([]);
  const [prevChars, setPrevChars] = useState<string[]>([]);
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!value || value <= 0) return;

    const formatted = formatPrice(value);
    const chars = formatted.split("");
    
    if (isFirstRender.current) {
      setDisplayChars(chars);
      setPrevChars(chars);
      isFirstRender.current = false;
      prevValueRef.current = value;
      return;
    }

    if (value !== prevValueRef.current) {
      const prevFormatted = formatPrice(prevValueRef.current);
      const prevCharsArr = prevFormatted.split("");
      
      const direction = value > prevValueRef.current ? "up" : "down";
      setFlash(direction);
      setTimeout(() => setFlash(null), 350);

      const changedIndices = new Set<number>();
      const maxLen = Math.max(chars.length, prevCharsArr.length);
      
      for (let i = 0; i < maxLen; i++) {
        if (chars[i] !== prevCharsArr[i]) {
          changedIndices.add(i);
        }
      }

      setPrevChars(prevCharsArr);
      setDisplayChars(chars);
      setAnimatingIndices(changedIndices);

      setTimeout(() => setAnimatingIndices(new Set()), 250);
      prevValueRef.current = value;
    }
  }, [value, formatPrice]);

  const maxLen = Math.max(displayChars.length, prevChars.length);
  const paddedDisplay = displayChars.join("").padStart(maxLen, " ").split("");
  const paddedPrev = prevChars.join("").padStart(maxLen, " ").split("");

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono tabular-nums text-sm font-medium transition-colors duration-150 rounded px-1",
        flash === "up" && "text-success bg-success/10",
        flash === "down" && "text-destructive bg-destructive/10",
        !flash && "text-foreground",
        className
      )}
    >
      {paddedDisplay.map((char, idx) => (
        <RollingDigit
          key={`${idx}-${paddedDisplay.length}`}
          digit={char}
          prevDigit={paddedPrev[idx] || char}
          isAnimating={animatingIndices.has(idx)}
        />
      ))}
    </span>
  );
});

RollingPriceCompact.displayName = "RollingPriceCompact";

// Large ticker display
export const RollingPriceLarge = memo(({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const { formatPrice } = useCurrency();
  const [displayChars, setDisplayChars] = useState<string[]>([]);
  const [prevChars, setPrevChars] = useState<string[]>([]);
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!value || value <= 0) return;

    const formatted = formatPrice(value);
    const chars = formatted.split("");
    
    if (isFirstRender.current) {
      setDisplayChars(chars);
      setPrevChars(chars);
      isFirstRender.current = false;
      prevValueRef.current = value;
      return;
    }

    if (value !== prevValueRef.current) {
      const prevFormatted = formatPrice(prevValueRef.current);
      const prevCharsArr = prevFormatted.split("");
      
      const direction = value > prevValueRef.current ? "up" : "down";
      setFlash(direction);
      setTimeout(() => setFlash(null), 500);

      const changedIndices = new Set<number>();
      const maxLen = Math.max(chars.length, prevCharsArr.length);
      
      for (let i = 0; i < maxLen; i++) {
        if (chars[i] !== prevCharsArr[i]) {
          changedIndices.add(i);
        }
      }

      setPrevChars(prevCharsArr);
      setDisplayChars(chars);
      setAnimatingIndices(changedIndices);

      setTimeout(() => setAnimatingIndices(new Set()), 350);
      prevValueRef.current = value;
    }
  }, [value, formatPrice]);

  const maxLen = Math.max(displayChars.length, prevChars.length);
  const paddedDisplay = displayChars.join("").padStart(maxLen, " ").split("");
  const paddedPrev = prevChars.join("").padStart(maxLen, " ").split("");

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono tabular-nums text-lg font-bold transition-colors duration-200",
        flash === "up" && "text-success",
        flash === "down" && "text-destructive",
        !flash && "text-foreground",
        className
      )}
    >
      {paddedDisplay.map((char, idx) => (
        <RollingDigit
          key={`${idx}-${paddedDisplay.length}`}
          digit={char}
          prevDigit={paddedPrev[idx] || char}
          isAnimating={animatingIndices.has(idx)}
        />
      ))}
    </span>
  );
});

RollingPriceLarge.displayName = "RollingPriceLarge";

export default RollingPrice;
