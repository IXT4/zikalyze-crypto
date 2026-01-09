
-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Fix all security vulnerabilities identified in scan
-- =====================================================

-- 1. FIX: user_email_preferences - Change from public to authenticated role
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can insert their own email preferences" ON public.user_email_preferences;
DROP POLICY IF EXISTS "Users can update their own email preferences" ON public.user_email_preferences;
DROP POLICY IF EXISTS "Users can view their own email preferences" ON public.user_email_preferences;

-- Recreate with authenticated role only (not public)
CREATE POLICY "Users can view their own email preferences"
ON public.user_email_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email preferences"
ON public.user_email_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences"
ON public.user_email_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email preferences"
ON public.user_email_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Revoke anon access completely
REVOKE ALL ON public.user_email_preferences FROM anon;

-- 2. FIX: push_subscriptions - Change from public to authenticated role
DROP POLICY IF EXISTS "Block direct read - use safe view" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;

-- Block ALL access from public - only service role can access
CREATE POLICY "Block all access - service role only"
ON public.push_subscriptions
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Revoke anon access
REVOKE ALL ON public.push_subscriptions FROM anon;

-- 3. FIX: user_2fa - Strengthen policies to prevent extraction
DROP POLICY IF EXISTS "Block direct read access to 2FA secrets" ON public.user_2fa;
DROP POLICY IF EXISTS "Users can delete their own 2FA settings" ON public.user_2fa;
DROP POLICY IF EXISTS "Users can insert their own 2FA settings" ON public.user_2fa;
DROP POLICY IF EXISTS "Users can update their own 2FA settings" ON public.user_2fa;

-- Block ALL direct access - only edge functions with service role can access
CREATE POLICY "Block all direct access - service role only"
ON public.user_2fa
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Revoke anon access
REVOKE ALL ON public.user_2fa FROM anon;

-- 4. FIX: alert_digest_queue - Change from public to authenticated role
DROP POLICY IF EXISTS "Users can delete their own digest alerts" ON public.alert_digest_queue;
DROP POLICY IF EXISTS "Users can insert their own digest alerts" ON public.alert_digest_queue;
DROP POLICY IF EXISTS "Users can update their own digest alerts" ON public.alert_digest_queue;
DROP POLICY IF EXISTS "Users can view their own digest queue" ON public.alert_digest_queue;

CREATE POLICY "Users can view their own digest queue"
ON public.alert_digest_queue
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own digest alerts"
ON public.alert_digest_queue
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own digest alerts"
ON public.alert_digest_queue
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own digest alerts"
ON public.alert_digest_queue
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Revoke anon access
REVOKE ALL ON public.alert_digest_queue FROM anon;

-- 5. FIX: user_sessions - Block all direct client access
DROP POLICY IF EXISTS "Block direct read - use safe view" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can insert sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can update sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;

-- Block ALL access - only service role can access via edge functions
CREATE POLICY "Block all direct access"
ON public.user_sessions
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Revoke anon access
REVOKE ALL ON public.user_sessions FROM anon;

-- 6. FIX: Recreate safe views with security_invoker = true and proper RLS

-- Drop existing views
DROP VIEW IF EXISTS public.user_2fa_safe;
DROP VIEW IF EXISTS public.user_sessions_safe;
DROP VIEW IF EXISTS public.push_subscriptions_safe;
DROP VIEW IF EXISTS public.ai_learning_stats;

-- Recreate user_2fa_safe with security_invoker
CREATE VIEW public.user_2fa_safe
WITH (security_invoker = true)
AS SELECT 
  id,
  user_id,
  is_enabled,
  COALESCE(array_length(backup_codes, 1), 0) as backup_codes_remaining,
  created_at,
  updated_at
FROM public.user_2fa
WHERE user_id = auth.uid();

-- Recreate user_sessions_safe with security_invoker
CREATE VIEW public.user_sessions_safe
WITH (security_invoker = true)
AS SELECT 
  id,
  user_id,
  device_info,
  user_agent,
  CASE 
    WHEN ip_address IS NOT NULL THEN 
      regexp_replace(ip_address, '\d+\.\d+$', '***')
    ELSE NULL 
  END as ip_address_masked,
  is_current,
  last_active_at,
  created_at
FROM public.user_sessions
WHERE user_id = auth.uid();

-- Recreate push_subscriptions_safe with security_invoker
CREATE VIEW public.push_subscriptions_safe
WITH (security_invoker = true)
AS SELECT 
  id,
  user_id,
  CASE WHEN endpoint IS NOT NULL THEN true ELSE false END as is_subscribed,
  created_at,
  updated_at
FROM public.push_subscriptions
WHERE user_id = auth.uid();

-- Recreate ai_learning_stats with security_invoker (aggregate view - no user filtering needed)
CREATE VIEW public.ai_learning_stats
WITH (security_invoker = true)
AS SELECT 
  symbol,
  COUNT(*) FILTER (WHERE was_correct = true) as correct_predictions,
  COUNT(*) FILTER (WHERE was_correct = false) as incorrect_predictions,
  COUNT(*) FILTER (WHERE was_correct IS NOT NULL) as total_feedback,
  CASE 
    WHEN COUNT(*) FILTER (WHERE was_correct IS NOT NULL) > 0 THEN
      ROUND(
        (COUNT(*) FILTER (WHERE was_correct = true)::numeric / 
         COUNT(*) FILTER (WHERE was_correct IS NOT NULL)::numeric) * 100, 2
      )
    ELSE 0
  END as accuracy_percentage,
  ROUND(AVG(confidence) FILTER (WHERE was_correct = true), 2) as avg_confidence_when_correct,
  ROUND(AVG(confidence) FILTER (WHERE was_correct = false), 2) as avg_confidence_when_incorrect
FROM public.analysis_history
WHERE was_correct IS NOT NULL
GROUP BY symbol;

-- Grant access to views only for authenticated users
GRANT SELECT ON public.user_2fa_safe TO authenticated;
GRANT SELECT ON public.user_sessions_safe TO authenticated;
GRANT SELECT ON public.push_subscriptions_safe TO authenticated;
GRANT SELECT ON public.ai_learning_stats TO authenticated;

-- Revoke anon access from all views
REVOKE ALL ON public.user_2fa_safe FROM anon;
REVOKE ALL ON public.user_sessions_safe FROM anon;
REVOKE ALL ON public.push_subscriptions_safe FROM anon;
REVOKE ALL ON public.ai_learning_stats FROM anon;

-- 7. Additional hardening: Ensure RLS is enabled on all tables
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_digest_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
