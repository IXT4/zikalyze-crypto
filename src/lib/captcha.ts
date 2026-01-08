import { supabase } from "@/integrations/supabase/client";

// Turnstile site key - this is a public key, safe for frontend
// The user should replace this with their actual site key from Cloudflare Turnstile dashboard
// Get your site key at: https://dash.cloudflare.com/?to=/:account/turnstile
let cachedSiteKey: string | null = null;

export const getTurnstileSiteKey = async (): Promise<string | null> => {
  if (cachedSiteKey) return cachedSiteKey;
  
  try {
    const { data, error } = await supabase.functions.invoke('verify-captcha', {
      body: { action: 'get-site-key' }
    });
    
    if (error || !data?.siteKey) {
      console.warn('Could not fetch Turnstile site key');
      return null;
    }
    
    cachedSiteKey = data.siteKey;
    return cachedSiteKey;
  } catch (err) {
    console.error('Error fetching site key:', err);
    return null;
  }
};

export const verifyCaptcha = async (token: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-captcha', {
      body: { token }
    });

    if (error) {
      console.error('CAPTCHA verification error:', error);
      return { success: false, error: 'CAPTCHA verification failed' };
    }

    return data;
  } catch (err) {
    console.error('CAPTCHA verification exception:', err);
    return { success: false, error: 'CAPTCHA verification failed' };
  }
};
