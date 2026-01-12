// ═══════════════════════════════════════════════════════════════════════════════
// 💹 LivePrice — Clean Real-Time Price Display
// ═══════════════════════════════════════════════════════════════════════════════
// Simple, professional price display without aggressive animations
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface LivePriceProps {
  value: number;
  className?: string;
}

export const LivePrice = ({ value, className }: LivePriceProps) => {
  const { formatPrice } = useCurrency();

  return (
    <span
      className={cn(
        "tabular-nums font-semibold text-foreground",
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

  return (
    <span
      className={cn(
        "tabular-nums text-sm font-medium text-foreground",
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

  return (
    <span
      className={cn(
        "tabular-nums text-lg font-bold text-foreground",
        className
      )}
    >
      {formatPrice(value)}
    </span>
  );
};

export default LivePrice;
