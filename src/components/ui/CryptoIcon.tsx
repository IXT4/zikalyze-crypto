// ═══════════════════════════════════════════════════════════════════════════════
// 🪙 CryptoIcon — CoinMarketCap + Web3Icons CDN with Multi-Layer Fallback
// ═══════════════════════════════════════════════════════════════════════════════
// Primary: CoinMarketCap (verified) → Web3Icons (2700+) → Spothq → DiceBear
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { 
  getTokenImageUrl, 
  getSpothqFallbackUrl, 
  getFallbackIconUrl,
  getCMCImageUrl 
} from "@/lib/decentralizedMetadata";

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
  // 0=CMC, 1=web3icons, 2=spothq, 3=dicebear
  const [fallbackLevel, setFallbackLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const attemptedRef = useRef<Set<string>>(new Set());
  
  // Multi-layer URL selection with CoinMarketCap priority
  const getImageUrl = useCallback(() => {
    switch (fallbackLevel) {
      case 0:
        // CoinMarketCap verified (primary)
        const cmcUrl = getCMCImageUrl(symbol);
        if (cmcUrl) return cmcUrl;
        // If no CMC ID, skip to web3icons
        return getTokenImageUrl(symbol);
      case 1:
        return getTokenImageUrl(symbol); // @web3icons (2700+ tokens)
      case 2:
        return getSpothqFallbackUrl(symbol); // spothq (400+ tokens)
      case 3:
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
      if (fallbackLevel < 3) {
        setFallbackLevel(prev => prev + 1);
      } else {
        setIsLoading(false);
      }
      return;
    }
    
    attemptedRef.current.add(currentUrl);
    
    // Try next fallback level
    if (fallbackLevel < 3) {
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
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default CryptoIcon;
