import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSessionTracking() {
  const registered = useRef(false);

  useEffect(() => {
    const registerSession = async () => {
      if (registered.current) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        await supabase.functions.invoke("manage-sessions", {
          body: { action: "register" },
        });
        registered.current = true;
      } catch (error) {
        console.error("Failed to register session:", error);
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
  }, []);
}
