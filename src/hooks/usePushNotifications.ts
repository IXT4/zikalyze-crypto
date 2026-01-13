import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  isNotificationSupported,
  getNotificationPermission,
  enablePushNotifications,
  disablePushNotifications,
  getPushSettings,
  showNotification,
} from '@/lib/clientAuth';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if push is supported
  useEffect(() => {
    const supported = isNotificationSupported();
    setIsSupported(supported);
    
    if (!supported) {
      setIsLoading(false);
    }
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!isSupported || !user?.id) {
      setIsLoading(false);
      return;
    }
    
    try {
      const permission = getNotificationPermission();
      const settings = getPushSettings(user.id);
      setIsSubscribed(permission === 'granted' && settings.enabled);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser",
        variant: "destructive"
      });
      return false;
    }

    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to enable push notifications",
        variant: "destructive"
      });
      return false;
    }

    try {
      setIsLoading(true);

      const success = await enablePushNotifications(user.id);
      
      if (!success) {
        toast({
          title: "Permission Denied",
          description: "Please allow notifications in your browser settings",
          variant: "destructive"
        });
        return false;
      }

      setIsSubscribed(true);
      toast({
        title: "Push Notifications Enabled",
        description: "You'll receive alerts for price movements and market events"
      });
      
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: "Subscription Failed",
        description: "Could not enable push notifications",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id, toast]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      if (user?.id) {
        disablePushNotifications(user.id);
      }

      setIsSubscribed(false);
      toast({
        title: "Push Notifications Disabled",
        description: "You won't receive push alerts anymore"
      });
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: "Error",
        description: "Could not disable push notifications",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  // Helper to show a test notification
  const sendTestNotification = useCallback(() => {
    if (!isSubscribed) return;
    
    showNotification({
      title: "Test Notification",
      body: "Push notifications are working correctly!",
      urgency: "low",
    });
  }, [isSubscribed]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
