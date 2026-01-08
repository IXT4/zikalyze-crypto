import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = 'BMAOEKFP15nphuIcym7qsUcKxumxeCZfrQKE21HuAlyADnCVOkrOsy3vzg0ZScARSirk5JQSbJa3jZwYiCD6Ano';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if push is supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
    setIsSupported(supported);
    
    if (!supported) {
      setIsLoading(false);
      if (!VAPID_PUBLIC_KEY) {
        console.warn('VAPID public key not configured');
      }
    }
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!isSupported) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  useEffect(() => {
    if (isSupported) {
      // Register service worker
      navigator.serviceWorker.register('/sw.js')
        .then(() => checkSubscription())
        .catch((error) => {
          console.error('Service worker registration failed:', error);
          setIsLoading(false);
        });
    }
  }, [isSupported, checkSubscription]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser",
        variant: "destructive"
      });
      return false;
    }

    try {
      setIsLoading(true);

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to enable push notifications",
          variant: "destructive"
        });
        return false;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: "Permission Denied",
          description: "Please allow notifications in your browser settings",
          variant: "destructive"
        });
        return false;
      }

      // Get push subscription
      const registration = await navigator.serviceWorker.ready;
      
      // Unsubscribe from any existing subscription first
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const subscriptionJson = subscription.toJSON();
      
      // Save to database
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,endpoint'
      });

      if (error) {
        console.error('Error saving subscription:', error);
        throw error;
      }

      setIsSubscribed(true);
      toast({
        title: "Push Notifications Enabled",
        description: "You'll receive alerts even when the browser is closed"
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
  }, [isSupported, toast]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint);
        }
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
  }, [toast]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  };
}
