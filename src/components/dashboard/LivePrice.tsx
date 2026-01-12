// ═══════════════════════════════════════════════════════════════════════════════
// 💹 LivePrice — Real-Time Trading Price Display
// ═══════════════════════════════════════════════════════════════════════════════
// Natural, fast price updates like real trading platforms
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface LivePriceProps {
  value: number;
  className?: string;
}

export const LivePrice = ({ value, className }: LivePriceProps) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(value);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!value || value <= 0) return;
    if (value === prevValueRef.current) return;

    // Clear pending flash
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }

    // Determine direction and update
    const direction = value > prevValueRef.current ? "up" : "down";
    setFlash(direction);
    setDisplayValue(value);
    prevValueRef.current = value;

    // Quick flash fade - 400ms for natural feel
    flashTimeoutRef.current = setTimeout(() => {
      setFlash(null);
    }, 400);

    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [value]);

  return (
    <span
      className={cn(
        "tabular-nums font-semibold transition-colors duration-150",
        flash === "up" && "text-success",
        flash === "down" && "text-destructive",
        !flash && "text-foreground",
        className
      )}
    >
      {formatPrice(displayValue)}
    </span>
  );
};

// Compact version for tables with subtle background
export const LivePriceCompact = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(value);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!value || value <= 0) return;
    if (value === prevValueRef.current) return;

    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }

    const direction = value > prevValueRef.current ? "up" : "down";
    setFlash(direction);
    setDisplayValue(value);
    prevValueRef.current = value;

    // Slightly longer flash for table visibility
    flashTimeoutRef.current = setTimeout(() => {
      setFlash(null);
    }, 500);

    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [value]);

  return (
    <span
      className={cn(
        "inline-block tabular-nums text-sm font-medium px-1 rounded transition-all duration-150",
        flash === "up" && "text-success bg-success/10",
        flash === "down" && "text-destructive bg-destructive/10",
        !flash && "text-foreground bg-transparent",
        className
      )}
    >
      {formatPrice(displayValue)}
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
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(value);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!value || value <= 0) return;
    if (value === prevValueRef.current) return;

    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }

    const direction = value > prevValueRef.current ? "up" : "down";
    setFlash(direction);
    setDisplayValue(value);
    prevValueRef.current = value;

    flashTimeoutRef.current = setTimeout(() => {
      setFlash(null);
    }, 450);

    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [value]);

  return (
    <span
      className={cn(
        "tabular-nums text-lg font-bold transition-colors duration-150",
        flash === "up" && "text-success",
        flash === "down" && "text-destructive",
        !flash && "text-foreground",
        className
      )}
    >
      {formatPrice(displayValue)}
    </span>
  );
};

export default LivePrice;
