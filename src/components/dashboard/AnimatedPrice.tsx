// ═══════════════════════════════════════════════════════════════════════════════
// 💰 AnimatedPrice — Smooth Price Transitions (No Falling/Jumping)
// ═══════════════════════════════════════════════════════════════════════════════
// Animated number display that smoothly transitions between values
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface AnimatedPriceProps {
  value: number;
  className?: string;
  duration?: number; // Animation duration in ms
  showFlash?: boolean; // Show color flash on change
}

export const AnimatedPrice = ({
  value,
  className,
  duration = 300,
  showFlash = true,
}: AnimatedPriceProps) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const animationRef = useRef<number | null>(null);
  const prevValueRef = useRef(value);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef<number>(value);

  useEffect(() => {
    // Skip animation if value hasn't changed or is invalid
    if (value === prevValueRef.current || !value || value <= 0) {
      if (value > 0) setDisplayValue(value);
      return;
    }

    // Determine flash direction
    if (showFlash) {
      const direction = value > prevValueRef.current ? "up" : "down";
      setFlash(direction);
      setTimeout(() => setFlash(null), 400);
    }

    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = displayValue;
    const endValue = value;
    const startTime = performance.now();

    startValueRef.current = startValue;
    startTimeRef.current = startTime;

    // Easing function for smooth animation
    const easeOutQuart = (t: number): number => {
      return 1 - Math.pow(1 - t, 4);
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    prevValueRef.current = value;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, showFlash]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <span
      className={cn(
        "tabular-nums transition-colors duration-200 inline-block",
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

// Compact version for tables
export const AnimatedPriceCompact = ({
  value,
  className,
  duration = 250,
}: Omit<AnimatedPriceProps, "showFlash">) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const animationRef = useRef<number | null>(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value === prevValueRef.current || !value || value <= 0) {
      if (value > 0) setDisplayValue(value);
      return;
    }

    // Flash effect
    const direction = value > prevValueRef.current ? "up" : "down";
    setFlash(direction);
    setTimeout(() => setFlash(null), 350);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = displayValue;
    const endValue = value;
    const startTime = performance.now();

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      setDisplayValue(startValue + (endValue - startValue) * easedProgress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    prevValueRef.current = value;

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value, duration]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <span
      className={cn(
        "tabular-nums font-medium text-sm transition-colors duration-150",
        flash === "up" && "text-success bg-success/10 rounded px-1",
        flash === "down" && "text-destructive bg-destructive/10 rounded px-1",
        !flash && "text-foreground",
        className
      )}
    >
      {formatPrice(displayValue)}
    </span>
  );
};

// Large hero price display
export const AnimatedPriceHero = ({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) => {
  const { formatPrice } = useCurrency();
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const animationRef = useRef<number | null>(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value === prevValueRef.current || !value || value <= 0) {
      if (value > 0) setDisplayValue(value);
      return;
    }

    const direction = value > prevValueRef.current ? "up" : "down";
    setFlash(direction);
    setTimeout(() => setFlash(null), 500);

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const startValue = displayValue;
    const startTime = performance.now();
    const duration = 400;

    const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayValue(startValue + (value - startValue) * easeOutQuart(progress));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    prevValueRef.current = value;

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span
        className={cn(
          "text-3xl font-bold tabular-nums transition-colors duration-200",
          flash === "up" && "text-success",
          flash === "down" && "text-destructive",
          !flash && "text-foreground"
        )}
      >
        {formatPrice(displayValue)}
      </span>
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
};

export default AnimatedPrice;
