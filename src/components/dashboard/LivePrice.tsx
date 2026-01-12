// ═══════════════════════════════════════════════════════════════════════════════
// 💹 LivePrice — Professional Price Display with Directional Animation
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface LivePriceProps {
  value: number;
  className?: string;
}

// Directional flash with slide effect
const useDirectionalFlash = (value: number) => {
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
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

    // Set direction
    setDirection(value > prevValueRef.current ? "up" : "down");
    prevValueRef.current = value;

    // Clear after animation (500ms)
    timeoutRef.current = setTimeout(() => {
      setDirection(null);
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return direction;
};

export const LivePrice = ({ value, className }: LivePriceProps) => {
  const { formatPrice } = useCurrency();
  const direction = useDirectionalFlash(value);

  return (
    <span
      className={cn(
        "tabular-nums font-semibold inline-block transition-all duration-300 ease-out",
        direction === "up" && "text-success -translate-y-0.5",
        direction === "down" && "text-destructive translate-y-0.5",
        !direction && "text-foreground translate-y-0",
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
  const direction = useDirectionalFlash(value);

  return (
    <span
      className={cn(
        "tabular-nums text-sm font-medium inline-block transition-all duration-300 ease-out",
        direction === "up" && "text-success -translate-y-0.5",
        direction === "down" && "text-destructive translate-y-0.5",
        !direction && "text-foreground translate-y-0",
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
  const direction = useDirectionalFlash(value);

  return (
    <span
      className={cn(
        "tabular-nums text-lg font-bold inline-block transition-all duration-300 ease-out",
        direction === "up" && "text-success -translate-y-0.5",
        direction === "down" && "text-destructive translate-y-0.5",
        !direction && "text-foreground translate-y-0",
        className
      )}
    >
      {formatPrice(value)}
    </span>
  );
};

export default LivePrice;
