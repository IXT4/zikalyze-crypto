import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerSession, clearAllSessions } from "@/lib/clientAuth";

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

    const registerSessionAsync = async () => {
      if (registered.current) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          // No active session - don't register
          return;
        }

        // Use client-side session tracking
        await registerSession(session.user.id);
        registered.current = true;
      } catch (error) {
        console.warn("Session tracking error:", error);
      }
    };

    registerSessionAsync();

    // Re-register on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.id) {
        registered.current = false;
        registerSession(session.user.id).catch(console.warn);
        registered.current = true;
      } else if (event === "SIGNED_OUT") {
        // Clear local sessions on logout
        if (session?.user?.id) {
          clearAllSessions(session.user.id);
        }
        registered.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [ready]);
}
