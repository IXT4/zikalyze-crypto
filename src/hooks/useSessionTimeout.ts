import { useState, useEffect, useCallback, useRef } from "react";

interface SessionTimeoutConfig {
  timeoutMs: number; // Total timeout in milliseconds
  warningMs: number; // Time before timeout to show warning
  onTimeout: () => void;
}

export const useSessionTimeout = ({
  timeoutMs = 15 * 60 * 1000, // 15 minutes default
  warningMs = 2 * 60 * 1000, // 2 minutes warning before timeout
  onTimeout,
}: SessionTimeoutConfig) => {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(warningMs);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(Date.now());

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const startCountdown = useCallback(() => {
    setRemainingTime(warningMs);
    countdownRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1000) {
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  }, [warningMs]);

  const resetTimers = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    lastActivityRef.current = Date.now();

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      startCountdown();
    }, timeoutMs - warningMs);

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      setShowWarning(false);
      onTimeout();
    }, timeoutMs);
  }, [clearAllTimers, timeoutMs, warningMs, onTimeout, startCountdown]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    resetTimers();
  }, [resetTimers]);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      // Only reset if warning is not showing
      if (!showWarning) {
        const now = Date.now();
        // Throttle resets to every 30 seconds
        if (now - lastActivityRef.current > 30000) {
          resetTimers();
        }
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timers
    resetTimers();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [resetTimers, clearAllTimers, showWarning]);

  return {
    showWarning,
    remainingTime,
    extendSession,
  };
};
