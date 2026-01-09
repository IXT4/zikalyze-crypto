-- Fix RLS on user_2fa_safe view - ensure only user can see their own 2FA status
DROP POLICY IF EXISTS "Users can view own 2fa status" ON public.user_2fa;

-- Revoke direct access to user_2fa table from anon
REVOKE ALL ON public.user_2fa FROM anon;

-- Fix push_subscriptions_safe view - add RLS policy  
CREATE POLICY "Users can view own push subscriptions via safe view"
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Revoke anon access to push_subscriptions
REVOKE ALL ON public.push_subscriptions FROM anon;

-- Fix user_sessions - revoke anon access
REVOKE ALL ON public.user_sessions FROM anon;

-- Fix user_email_preferences - ensure only authenticated users access
REVOKE ALL ON public.user_email_preferences FROM anon;

-- Revoke anon access from alert_digest_queue
REVOKE ALL ON public.alert_digest_queue FROM anon;

-- Ensure views are only accessible to authenticated users
REVOKE ALL ON public.user_2fa_safe FROM anon;
REVOKE ALL ON public.user_sessions_safe FROM anon;
REVOKE ALL ON public.push_subscriptions_safe FROM anon;
REVOKE ALL ON public.ai_learning_stats FROM anon;

-- Grant to authenticated only
GRANT SELECT ON public.user_2fa_safe TO authenticated;
GRANT SELECT ON public.user_sessions_safe TO authenticated;
GRANT SELECT ON public.push_subscriptions_safe TO authenticated;
GRANT SELECT ON public.ai_learning_stats TO authenticated;