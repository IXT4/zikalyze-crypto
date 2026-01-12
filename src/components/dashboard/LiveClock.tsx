// ═══════════════════════════════════════════════════════════════════════════════
// 🕐 LiveClock — Real-Time Market Clock Display
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LiveClockProps {
  className?: string;
  showSeconds?: boolean;
  showDate?: boolean;
}

export const LiveClock = ({ className, showSeconds = true, showDate = false }: LiveClockProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showDate && (
        <span className="text-xs text-muted-foreground">{dateStr}</span>
      )}
      <div className="flex items-center font-mono tabular-nums">
        <span className="text-foreground font-semibold">{hours}</span>
        <span className="text-muted-foreground animate-pulse">:</span>
        <span className="text-foreground font-semibold">{minutes}</span>
        {showSeconds && (
          <>
            <span className="text-muted-foreground animate-pulse">:</span>
            <span className="text-muted-foreground">{seconds}</span>
          </>
        )}
      </div>
    </div>
  );
};

// Compact clock for header/ticker areas
export const LiveClockCompact = ({ className }: { className?: string }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/50 border border-border text-xs font-mono tabular-nums",
      className
    )}>
      <span className="text-foreground">{hours}</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-foreground">{minutes}</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-muted-foreground">{seconds}</span>
    </div>
  );
};

export default LiveClock;
