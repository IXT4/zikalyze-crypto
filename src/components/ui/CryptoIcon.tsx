// ═══════════════════════════════════════════════════════════════════════════════
// 🪙 CryptoIcon — Web3Icons CDN with Multi-Layer Fallback (2700+ tokens)
// ═══════════════════════════════════════════════════════════════════════════════
// Primary: @web3icons (2700+ tokens) → Fallback: spothq → Final: DiceBear avatar
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { getTokenImageUrl, getSpothqFallbackUrl, getFallbackIconUrl } from "@/lib/decentralizedMetadata";

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
  const [fallbackLevel, setFallbackLevel] = useState(0); // 0=web3icons, 1=spothq, 2=dicebear
  const [isLoading, setIsLoading] = useState(true);
  const attemptedRef = useRef<Set<string>>(new Set());
  
  // Multi-layer URL selection
  const getImageUrl = useCallback(() => {
    switch (fallbackLevel) {
      case 0:
        return getTokenImageUrl(symbol); // @web3icons (2700+ tokens)
      case 1:
        return getSpothqFallbackUrl(symbol); // spothq (400+ tokens)
      case 2:
      default:
        return getFallbackIconUrl(symbol); // DiceBear avatar
    }
  }, [symbol, fallbackLevel]);
  
  const handleError = useCallback(() => {
    if (!showFallback) {
      setIsLoading(false);
      return;
    }
    
    const currentUrl = getImageUrl();
    if (attemptedRef.current.has(currentUrl)) {
      // Already tried this URL, move to next fallback
      if (fallbackLevel < 2) {
        setFallbackLevel(prev => prev + 1);
      } else {
        setIsLoading(false);
      }
      return;
    }
    
    attemptedRef.current.add(currentUrl);
    
    // Try next fallback level
    if (fallbackLevel < 2) {
      setFallbackLevel(prev => prev + 1);
    } else {
      setIsLoading(false);
    }
  }, [showFallback, fallbackLevel, getImageUrl]);
  
  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);
  
  const imageUrl = getImageUrl();
  
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
        key={imageUrl} // Force re-render on URL change
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
