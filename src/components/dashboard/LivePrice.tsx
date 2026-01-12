// ═══════════════════════════════════════════════════════════════════════════════
// 💹 LivePrice — CoinMarketCap-Style Real-Time Price Flash
// ═══════════════════════════════════════════════════════════════════════════════
// Smooth, vibrant price updates like Binance/CoinMarketCap live tickers
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
  const [flashClass, setFlashClass] = useState<string | null>(null);
  const prevValueRef = useRef<number | undefined>(undefined);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    // Skip flash on initial mount
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      prevValueRef.current = value;
      return;
    }

    // Skip if no valid value or no change
    if (!value || value <= 0 || value === prevValueRef.current) return;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Determine direction and apply flash class
    if (value > prevValueRef.current!) {
      setFlashClass("price-flash-up");
    } else if (value < prevValueRef.current!) {
      setFlashClass("price-flash-down");
    }

    // Remove flash class after exactly 800ms
    timeoutRef.current = setTimeout(() => {
      setFlashClass(null);
    }, 800);

    // Update ref with current price
    prevValueRef.current = value;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return (
    <span
      className={cn(
        "price-display tabular-nums font-semibold inline-block",
        flashClass,
        !flashClass && "text-foreground",
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
  const [flashClass, setFlashClass] = useState<string | null>(null);
  const prevValueRef = useRef<number | undefined>(undefined);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      prevValueRef.current = value;
      return;
    }

    if (!value || value <= 0 || value === prevValueRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value > prevValueRef.current!) {
      setFlashClass("price-flash-up");
    } else if (value < prevValueRef.current!) {
      setFlashClass("price-flash-down");
    }

    timeoutRef.current = setTimeout(() => {
      setFlashClass(null);
    }, 800);

    prevValueRef.current = value;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return (
    <span
      className={cn(
        "price-display inline-block tabular-nums text-sm font-medium px-1 rounded",
        flashClass,
        !flashClass && "text-foreground bg-transparent",
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
  const [flashClass, setFlashClass] = useState<string | null>(null);
  const prevValueRef = useRef<number | undefined>(undefined);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      prevValueRef.current = value;
      return;
    }

    if (!value || value <= 0 || value === prevValueRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value > prevValueRef.current!) {
      setFlashClass("price-flash-up");
    } else if (value < prevValueRef.current!) {
      setFlashClass("price-flash-down");
    }

    timeoutRef.current = setTimeout(() => {
      setFlashClass(null);
    }, 800);

    prevValueRef.current = value;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return (
    <span
      className={cn(
        "price-display tabular-nums text-lg font-bold inline-block",
        flashClass,
        !flashClass && "text-foreground",
        className
      )}
    >
      {formatPrice(value)}
    </span>
  );
};

export default LivePrice;
