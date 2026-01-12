// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 usePriceAlertsClient — Fully Client-Side Price Alerts
// ═══════════════════════════════════════════════════════════════════════════════
// Runs 100% in the browser with IndexedDB storage and optional cloud sync
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { alertSound } from '@/lib/alertSound';
import { isSoundEnabled } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import * as storage from '@/lib/clientStorage';
import { queueSync, STORES } from '@/lib/clientStorage';

export interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  target_price: number;
  condition: 'above' | 'below';
  current_price_at_creation: number;
  is_triggered: boolean;
  triggered_at: string | null;
  created_at: string;
  user_id: string | null;
}

export const usePriceAlertsClient = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const notificationPermission = useRef<NotificationPermission>('default');
  const { user } = useAuth();

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        notificationPermission.current = permission;
      });
    }
  }, []);

  // Load alerts from IndexedDB
  const fetchAlerts = useCallback(async () => {
    try {
      const localAlerts = await storage.getPriceAlerts(true);
      // Filter by user if logged in
      const filtered = user 
        ? localAlerts.filter(a => a.user_id === user.id || a.user_id === null)
        : localAlerts.filter(a => a.user_id === null);
      
      setAlerts(filtered.map(a => ({
        id: a.id,
        symbol: a.symbol,
        name: a.name,
        target_price: a.target_price,
        condition: a.condition,
        current_price_at_creation: a.current_price_at_creation,
        is_triggered: a.is_triggered,
        triggered_at: a.triggered_at,
        created_at: a.created_at,
        user_id: a.user_id,
      })));
    } catch (err) {
      console.error('[PriceAlerts] Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Create a new alert
  const createAlert = async (
    symbol: string,
    name: string,
    targetPrice: number,
    condition: 'above' | 'below',
    currentPrice: number
  ): Promise<boolean> => {
    try {
      const newAlert: storage.ClientPriceAlert = {
        id: storage.generateId(),
        symbol: symbol.toUpperCase(),
        name,
        target_price: targetPrice,
        condition,
        current_price_at_creation: currentPrice,
        is_triggered: false,
        triggered_at: null,
        created_at: new Date().toISOString(),
        user_id: user?.id || null,
        synced: false,
      };

      // Save to IndexedDB
      await storage.savePriceAlert(newAlert);

      // Queue for cloud sync if user is authenticated
      if (user) {
        await queueSync({
          type: 'create',
          store: STORES.PRICE_ALERTS,
          data: newAlert,
        });
      }

      // Update local state
      setAlerts(prev => [
        {
          id: newAlert.id,
          symbol: newAlert.symbol,
          name: newAlert.name,
          target_price: newAlert.target_price,
          condition: newAlert.condition,
          current_price_at_creation: newAlert.current_price_at_creation,
          is_triggered: newAlert.is_triggered,
          triggered_at: newAlert.triggered_at,
          created_at: newAlert.created_at,
          user_id: newAlert.user_id,
        },
        ...prev,
      ]);

      toast.success(
        `Alert set for ${symbol.toUpperCase()} ${condition} $${targetPrice.toLocaleString()}`
      );
      return true;
    } catch (err) {
      console.error('[PriceAlerts] Error creating alert:', err);
      toast.error('Failed to create alert');
      return false;
    }
  };

  // Remove an alert
  const removeAlert = async (alertId: string): Promise<boolean> => {
    try {
      const alert = alerts.find(a => a.id === alertId);
      
      // Delete from IndexedDB
      await storage.deletePriceAlert(alertId);

      // Queue for cloud sync if user is authenticated
      if (user && alert) {
        await queueSync({
          type: 'delete',
          store: STORES.PRICE_ALERTS,
          data: alert,
        });
      }

      // Update local state
      setAlerts(prev => prev.filter(a => a.id !== alertId));

      toast.info('Alert permanently deleted');
      return true;
    } catch (err) {
      console.error('[PriceAlerts] Error removing alert:', err);
      toast.error('Failed to remove alert');
      return false;
    }
  };

  // Check prices and trigger alerts
  const checkAlerts = useCallback(
    async (prices: { symbol: string; current_price: number; price_change_percentage_24h?: number; total_volume?: number }[]) => {
      if (prices.length === 0 || alerts.length === 0) return;

      const triggeredAlerts: PriceAlert[] = [];

      for (const alert of alerts) {
        const alertSymbol = alert.symbol.toUpperCase();
        const crypto = prices.find(
          (p) => p.symbol.toUpperCase() === alertSymbol
        );

        if (!crypto || !crypto.current_price) continue;

        const currentPrice = crypto.current_price;
        let shouldTrigger = false;

        if (alert.condition === 'above' && currentPrice >= alert.target_price) {
          shouldTrigger = true;
        } else if (alert.condition === 'below' && currentPrice <= alert.target_price) {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          triggeredAlerts.push(alert);

          // Play alert sound if enabled
          try {
            if (isSoundEnabled()) {
              alertSound.unlock();
              await alertSound.playAlertSound();
            }
          } catch (err) {
            console.error('[PriceAlerts] Error playing sound:', err);
          }

          // Show browser notification
          if (
            'Notification' in window &&
            notificationPermission.current === 'granted'
          ) {
            try {
              const notification = new Notification(`🎯 ${alert.symbol} Price Alert Triggered!`, {
                body: `${alert.symbol} is now ${alert.condition === 'above' ? 'above' : 'below'} $${alert.target_price.toLocaleString()} • Current: $${currentPrice.toLocaleString()}`,
                icon: '/pwa-192x192.png',
                tag: alert.id,
                requireInteraction: false,
              });
              setTimeout(() => notification.close(), 8000);
            } catch (err) {
              console.error('[PriceAlerts] Error showing notification:', err);
            }
          }

          // Show toast
          toast.success(
            `🎯 ${alert.symbol} hit $${currentPrice.toLocaleString()} (target: ${alert.condition} $${alert.target_price.toLocaleString()})`,
            { duration: 6000 }
          );

          // Mark as triggered in IndexedDB
          try {
            await storage.markAlertTriggered(alert.id);

            // Queue for cloud sync
            if (user) {
              await queueSync({
                type: 'update',
                store: STORES.PRICE_ALERTS,
                data: {
                  ...alert,
                  is_triggered: true,
                  triggered_at: new Date().toISOString(),
                },
              });
            }
          } catch (err) {
            console.error('[PriceAlerts] Error marking triggered:', err);
          }
        }
      }

      if (triggeredAlerts.length > 0) {
        setAlerts(prev =>
          prev.filter(a => !triggeredAlerts.find(t => t.id === a.id))
        );
      }
    },
    [alerts, user]
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

// Re-export as usePriceAlerts for backward compatibility
export { usePriceAlertsClient as usePriceAlerts };
