import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSessionTracking() {
  const registered = useRef(false);
  const [ready, setReady] = useState(false);

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
        if (!session) return;

        await supabase.functions.invoke("manage-sessions", {
          body: { action: "register" },
        });
        registered.current = true;
      } catch (error) {
        // Silently fail - session tracking is non-critical
        console.warn("Session tracking unavailable:", error);
      }
    };

    registerSession();

    // Re-register on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        registered.current = false;
        registerSession();
      } else if (event === "SIGNED_OUT") {
        registered.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [ready]);
}
