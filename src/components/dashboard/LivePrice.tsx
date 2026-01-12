// ═══════════════════════════════════════════════════════════════════════════════
// 💹 LivePrice — Smooth Professional Price Display with Subtle Flash
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface LivePriceProps {
  value: number;
  className?: string;
}

// Subtle flash effect - professional and non-distracting
const useSubtleFlash = (value: number) => {
  const [flashDirection, setFlashDirection] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Skip first render
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      prevValueRef.current = value;
      return;
    }

    // Skip invalid or unchanged values
    if (!value || value <= 0 || value === prevValueRef.current) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set flash direction
    setFlashDirection(value > prevValueRef.current ? "up" : "down");
    prevValueRef.current = value;

    // Clear flash after animation (400ms for smooth fade)
    timeoutRef.current = setTimeout(() => {
      setFlashDirection(null);
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return flashDirection;
};

export const LivePrice = ({ value, className }: LivePriceProps) => {
  const { formatPrice } = useCurrency();
  const flash = useSubtleFlash(value);

  return (
    <span
      className={cn(
        "tabular-nums font-semibold transition-colors duration-300 ease-out",
        flash === "up" && "text-success",
        flash === "down" && "text-destructive",
        !flash && "text-foreground",
        className
      )}
    >
      {formatPrice(value)}
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
  const flash = useSubtleFlash(value);

  return (
    <span
      className={cn(
        "tabular-nums text-sm font-medium transition-colors duration-300 ease-out",
        flash === "up" && "text-success",
        flash === "down" && "text-destructive",
        !flash && "text-foreground",
        className
      )}
    >
      {formatPrice(value)}
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
  const flash = useSubtleFlash(value);

  return (
    <span
      className={cn(
        "tabular-nums text-lg font-bold transition-colors duration-300 ease-out",
        flash === "up" && "text-success",
        flash === "down" && "text-destructive",
        !flash && "text-foreground",
        className
      )}
    >
      {formatPrice(value)}
    </span>
  );
};

export default LivePrice;
