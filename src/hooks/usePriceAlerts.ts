import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { alertSound } from "@/lib/alertSound";
import { isSoundEnabled } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";

export interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  target_price: number;
  condition: "above" | "below";
  current_price_at_creation: number;
  is_triggered: boolean;
  triggered_at: string | null;
  created_at: string;
  user_id: string | null;
}

export const usePriceAlerts = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const notificationPermission = useRef<NotificationPermission>("default");
  const { user } = useAuth();

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        notificationPermission.current = permission;
      });
    }
  }, []);

  // Fetch alerts from database
  const fetchAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("price_alerts")
        .select("*")
        .eq("is_triggered", false)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching alerts:", error);
        return;
      }

      const typedData = (data || []).map((item) => ({
        ...item,
        condition: item.condition as "above" | "below",
      }));
      setAlerts(typedData);
    } catch (err) {
      console.error("Error in fetchAlerts:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscribe to realtime changes
  useEffect(() => {
    fetchAlerts();

    if (!user) return;

    const channel = supabase
      .channel("price-alerts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "price_alerts",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts, user]);

  // Create a new alert
  const createAlert = async (
    symbol: string,
    name: string,
    targetPrice: number,
    condition: "above" | "below",
    currentPrice: number
  ): Promise<boolean> => {
    if (!user) {
      toast.error("Please sign in to create alerts");
      return false;
    }

    try {
      const { error } = await supabase.from("price_alerts").insert({
        symbol: symbol.toUpperCase(),
        name,
        target_price: targetPrice,
        condition,
        current_price_at_creation: currentPrice,
        user_id: user.id,
      });

      if (error) {
        console.error("Error creating alert:", error);
        toast.error("Failed to create alert");
        return false;
      }

      toast.success(
        `Alert set for ${symbol.toUpperCase()} ${condition} $${targetPrice.toLocaleString()}`
      );
      return true;
    } catch (err) {
      console.error("Error in createAlert:", err);
      toast.error("Failed to create alert");
      return false;
    }
  };

  // Remove an alert
  const removeAlert = async (alertId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("price_alerts")
        .delete()
        .eq("id", alertId);

      if (error) {
        console.error("Error removing alert:", error);
        toast.error("Failed to remove alert");
        return false;
      }

      toast.info("Alert removed");
      return true;
    } catch (err) {
      console.error("Error in removeAlert:", err);
      toast.error("Failed to remove alert");
      return false;
    }
  };

  // Check prices and trigger alerts
  const checkAlerts = useCallback(
    async (prices: { symbol: string; current_price: number }[]) => {
      if (alerts.length === 0 || prices.length === 0) return;

      const triggeredAlerts: PriceAlert[] = [];

      for (const alert of alerts) {
        // Normalize symbol comparison - alerts store uppercase, prices might be lowercase
        const alertSymbol = alert.symbol.toUpperCase();
        const crypto = prices.find(
          (p) => p.symbol.toUpperCase() === alertSymbol
        );
        
        if (!crypto || !crypto.current_price) continue;

        const currentPrice = crypto.current_price;
        let shouldTrigger = false;

        if (alert.condition === "above" && currentPrice >= alert.target_price) {
          shouldTrigger = true;
        } else if (
          alert.condition === "below" &&
          currentPrice <= alert.target_price
        ) {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          triggeredAlerts.push(alert);

          // Play alert sound if enabled
          try {
            if (isSoundEnabled()) {
              await alertSound.playAlertSound();
            }
          } catch (err) {
            console.error("Error playing alert sound:", err);
          }

          // Show browser notification
          if (
            "Notification" in window &&
            notificationPermission.current === "granted"
          ) {
            try {
              new Notification(`🚨 ${alert.symbol} Price Alert!`, {
                body: `${alert.symbol} is now ${alert.condition === "above" ? "above" : "below"} $${alert.target_price.toLocaleString()}. Current price: $${currentPrice.toLocaleString()}`,
                icon: "/favicon.ico",
                tag: alert.id,
              });
            } catch (err) {
              console.error("Error showing notification:", err);
            }
          }

          // Show toast notification
          toast.success(
            `🚨 ${alert.symbol} hit $${currentPrice.toLocaleString()} (target: ${alert.condition} $${alert.target_price.toLocaleString()})`,
            {
              duration: 10000,
            }
          );

          // Mark as triggered in database
          try {
            await supabase
              .from("price_alerts")
              .update({
                is_triggered: true,
                triggered_at: new Date().toISOString(),
              })
              .eq("id", alert.id);
          } catch (err) {
            console.error("Error updating alert in database:", err);
          }
        }
      }

      if (triggeredAlerts.length > 0) {
        // Remove triggered alerts from local state
        setAlerts((prev) =>
          prev.filter((a) => !triggeredAlerts.find((t) => t.id === a.id))
        );
      }
    },
    [alerts]
  );

  return {
    alerts,
    loading,
    createAlert,
    removeAlert,
    checkAlerts,
    refetch: fetchAlerts,
  };
};
