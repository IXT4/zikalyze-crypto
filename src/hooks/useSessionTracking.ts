import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSessionTracking() {
  const registered = useRef(false);
  const [ready, setReady] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Delay initialization to avoid blocking render
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const registerSession = async () => {
      if (registered.current) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // No active session - don't retry
          return;
        }

        const { data, error } = await supabase.functions.invoke("manage-sessions", {
          body: { action: "register" },
        });
        
        if (error) {
          // Check if it's an auth error (401) - don't retry on auth failures
          const errorMessage = error.message?.toLowerCase() || '';
          if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid token')) {
            console.warn("Session tracking: auth expired, skipping");
            return;
          }
          throw error;
        }
        
        registered.current = true;
        retryCount.current = 0;
      } catch (error: any) {
        // Check for auth-related errors - don't retry these
        const errorMessage = error?.message?.toLowerCase() || '';
        if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid')) {
          console.warn("Session tracking: auth error, not retrying");
          return;
        }
        
        // Retry only on network failures
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          setTimeout(registerSession, 1000 * retryCount.current);
        } else {
          // Silently fail after retries - session tracking is non-critical
          console.warn("Session tracking unavailable after retries");
        }
      }
    };

    registerSession();

    // Re-register on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        registered.current = false;
        retryCount.current = 0;
        registerSession();
      } else if (event === "SIGNED_OUT") {
        registered.current = false;
        retryCount.current = 0;
      }
    });

    return () => subscription.unsubscribe();
  }, [ready]);
}
