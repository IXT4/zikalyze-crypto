-- Create secure view for user_2fa (hides totp_secret and backup_codes)
CREATE OR REPLACE VIEW public.user_2fa_safe AS
SELECT 
  id,
  user_id,
  is_enabled,
  created_at,
  updated_at,
  -- Only expose whether backup codes exist, not the actual codes
  CASE WHEN backup_codes IS NOT NULL AND array_length(backup_codes, 1) > 0 
       THEN array_length(backup_codes, 1) 
       ELSE 0 
  END AS backup_codes_remaining
FROM public.user_2fa;

-- Create secure view for user_sessions (hides session_token)
CREATE OR REPLACE VIEW public.user_sessions_safe AS
SELECT 
  id,
  user_id,
  -- Mask IP address to show only partial info
  CASE WHEN ip_address IS NOT NULL 
       THEN regexp_replace(ip_address, '\.\d+$', '.***') 
       ELSE NULL 
  END AS ip_address_masked,
  user_agent,
  device_info,
  is_current,
  last_active_at,
  created_at
FROM public.user_sessions;

-- Create secure view for push_subscriptions (hides auth and p256dh keys)
CREATE OR REPLACE VIEW public.push_subscriptions_safe AS
SELECT 
  id,
  user_id,
  -- Only show if subscription exists, not the actual endpoint
  CASE WHEN endpoint IS NOT NULL THEN true ELSE false END AS is_subscribed,
  created_at,
  updated_at
FROM public.push_subscriptions;

-- Enable RLS on the views
ALTER VIEW public.user_2fa_safe SET (security_invoker = on);
ALTER VIEW public.user_sessions_safe SET (security_invoker = on);
ALTER VIEW public.push_subscriptions_safe SET (security_invoker = on);

-- Grant SELECT on views to authenticated users
GRANT SELECT ON public.user_2fa_safe TO authenticated;
GRANT SELECT ON public.user_sessions_safe TO authenticated;
GRANT SELECT ON public.push_subscriptions_safe TO authenticated;