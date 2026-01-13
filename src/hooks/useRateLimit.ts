import {
  checkRateLimit as checkRateLimitClient,
  recordLoginAttempt as recordLoginAttemptClient,
  formatRetryAfter as formatRetryAfterClient,
} from "@/lib/clientAuth";

interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  max_attempts: number;
  retry_after: number;
}

export const useRateLimit = () => {
  const checkRateLimit = async (email: string): Promise<RateLimitResult> => {
    try {
      return await checkRateLimitClient(email.toLowerCase());
    } catch (err) {
      console.error("Rate limit check error:", err);
      return { allowed: true, attempts: 0, max_attempts: 5, retry_after: 0 };
    }
  };

  const recordLoginAttempt = async (email: string, success: boolean): Promise<void> => {
    try {
      await recordLoginAttemptClient(email.toLowerCase(), success);
    } catch (err) {
      console.error("Failed to record login attempt:", err);
    }
  };

  const formatRetryAfter = (seconds: number): string => {
    return formatRetryAfterClient(seconds);
  };

  return {
    checkRateLimit,
    recordLoginAttempt,
    formatRetryAfter,
  };
};
