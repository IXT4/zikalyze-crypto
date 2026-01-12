// ═══════════════════════════════════════════════════════════════════════════════
// 🪙 CryptoIcon — Decentralized Crypto Icon Component with Fallback
// ═══════════════════════════════════════════════════════════════════════════════
// Uses jsDelivr CDN for open-source icons with graceful fallback
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getTokenImageUrl, getFallbackIconUrl } from "@/lib/decentralizedMetadata";

interface CryptoIconProps {
  symbol: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showFallback?: boolean;
}

const SIZE_MAP = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-12 h-12",
};

export const CryptoIcon = ({
  symbol,
  size = "md",
  className,
  showFallback = true,
}: CryptoIconProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const primaryUrl = getTokenImageUrl(symbol);
  const fallbackUrl = getFallbackIconUrl(symbol);
  
  const handleError = useCallback(() => {
    if (!hasError && showFallback) {
      setHasError(true);
    }
    setIsLoading(false);
  }, [hasError, showFallback]);
  
  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);
  
  const imageUrl = hasError ? fallbackUrl : primaryUrl;
  
  return (
    <div className={cn("relative flex-shrink-0", SIZE_MAP[size], className)}>
      {isLoading && (
        <div 
          className={cn(
            "absolute inset-0 rounded-full bg-muted animate-pulse",
            SIZE_MAP[size]
          )} 
        />
      )}
      <img
        src={imageUrl}
        alt={`${symbol} icon`}
        className={cn(
          "rounded-full object-contain transition-opacity duration-200",
          SIZE_MAP[size],
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
      />
    </div>
  );
};

export default CryptoIcon;
