import { supabase } from "@/integrations/supabase/client";

interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  max_attempts: number;
  retry_after: number;
}

export const useRateLimit = () => {
  const checkRateLimit = async (email: string): Promise<RateLimitResult> => {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_email: email.toLowerCase(),
        p_max_attempts: 5,
        p_window_minutes: 15
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        // Allow the attempt if rate limit check fails (fail open for UX)
        return { allowed: true, attempts: 0, max_attempts: 5, retry_after: 0 };
      }

      return data as unknown as RateLimitResult;
    } catch (err) {
      console.error('Rate limit check error:', err);
      return { allowed: true, attempts: 0, max_attempts: 5, retry_after: 0 };
    }
  };

  const recordLoginAttempt = async (email: string, success: boolean): Promise<void> => {
    try {
      await supabase.rpc('record_login_attempt', {
        p_email: email.toLowerCase(),
        p_success: success
      });
    } catch (err) {
      console.error('Failed to record login attempt:', err);
    }
  };

  const formatRetryAfter = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  return {
    checkRateLimit,
    recordLoginAttempt,
    formatRetryAfter
  };
};
