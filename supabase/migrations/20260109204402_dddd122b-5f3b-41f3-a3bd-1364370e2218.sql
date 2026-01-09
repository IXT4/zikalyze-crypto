-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING MIGRATION - Fix all 9 security findings
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Block direct SELECT on push_subscriptions (use safe view instead)
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can view own push subscriptions via safe view" ON public.push_subscriptions;

CREATE POLICY "Block direct read - use safe view"
ON public.push_subscriptions
FOR SELECT
USING (false);

-- 2. Block direct SELECT on user_sessions (use safe view instead)
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;

CREATE POLICY "Block direct read - use safe view"
ON public.user_sessions
FOR SELECT
USING (false);

-- 3. Recreate safe views with security_invoker and proper RLS
-- Drop existing views first
DROP VIEW IF EXISTS public.push_subscriptions_safe;
DROP VIEW IF EXISTS public.user_sessions_safe;
DROP VIEW IF EXISTS public.user_2fa_safe;
DROP VIEW IF EXISTS public.ai_learning_stats;

-- Recreate push_subscriptions_safe (hides sensitive keys)
CREATE VIEW public.push_subscriptions_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  TRUE as is_subscribed,
  created_at,
  updated_at
FROM public.push_subscriptions;

-- Recreate user_sessions_safe (masks IP, hides session token)
CREATE VIEW public.user_sessions_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  device_info,
  CASE 
    WHEN ip_address IS NOT NULL THEN 
      regexp_replace(ip_address, '\d+\.\d+$', '***')
    ELSE NULL 
  END as ip_address_masked,
  user_agent,
  is_current,
  created_at,
  last_active_at
FROM public.user_sessions;

-- Recreate user_2fa_safe (hides secrets and codes)
CREATE VIEW public.user_2fa_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  is_enabled,
  COALESCE(array_length(backup_codes, 1), 0) as backup_codes_remaining,
  created_at,
  updated_at
FROM public.user_2fa;

-- Recreate ai_learning_stats as aggregated view (no user-specific data)
CREATE VIEW public.ai_learning_stats
WITH (security_invoker = true)
AS
SELECT 
  symbol,
  COUNT(*) FILTER (WHERE was_correct = true) as correct_predictions,
  COUNT(*) FILTER (WHERE was_correct = false) as incorrect_predictions,
  COUNT(*) FILTER (WHERE was_correct IS NOT NULL) as total_feedback,
  CASE 
    WHEN COUNT(*) FILTER (WHERE was_correct IS NOT NULL) > 0 THEN
      ROUND((COUNT(*) FILTER (WHERE was_correct = true)::numeric / 
             COUNT(*) FILTER (WHERE was_correct IS NOT NULL)::numeric) * 100, 2)
    ELSE 0
  END as accuracy_percentage,
  AVG(confidence) FILTER (WHERE was_correct = true) as avg_confidence_when_correct,
  AVG(confidence) FILTER (WHERE was_correct = false) as avg_confidence_when_incorrect
FROM public.analysis_history
WHERE user_id = auth.uid()
GROUP BY symbol;

-- 4. Grant proper access to safe views (authenticated only)
REVOKE ALL ON public.push_subscriptions_safe FROM anon;
REVOKE ALL ON public.user_sessions_safe FROM anon;
REVOKE ALL ON public.user_2fa_safe FROM anon;
REVOKE ALL ON public.ai_learning_stats FROM anon;

GRANT SELECT ON public.push_subscriptions_safe TO authenticated;
GRANT SELECT ON public.user_sessions_safe TO authenticated;
GRANT SELECT ON public.user_2fa_safe TO authenticated;
GRANT SELECT ON public.ai_learning_stats TO authenticated;

-- 5. Fix login_attempts - allow users to view their own attempts via RPC function
-- Keep the table locked but add a secure function for viewing own history
DROP POLICY IF EXISTS "No direct access to login attempts" ON public.login_attempts;

CREATE POLICY "Block all direct access"
ON public.login_attempts
FOR ALL
USING (false)
WITH CHECK (false);

-- Create secure function to view own login attempts
CREATE OR REPLACE FUNCTION public.get_my_login_attempts(p_limit integer DEFAULT 10)
RETURNS TABLE (
  attempted_at timestamp with time zone,
  success boolean,
  ip_masked text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Get the user's email from auth
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  
  IF v_email IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    la.attempted_at,
    la.success,
    CASE 
      WHEN la.ip_address IS NOT NULL THEN 
        regexp_replace(la.ip_address, '\d+\.\d+$', '***')
      ELSE NULL 
    END as ip_masked
  FROM public.login_attempts la
  WHERE la.email = LOWER(v_email)
  ORDER BY la.attempted_at DESC
  LIMIT p_limit;
END;
$$;

-- 6. Ensure user_email_preferences blocks email enumeration
-- Users can only see their OWN preferences - this is already enforced
-- But add index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_user_id 
ON public.user_email_preferences(user_id);

-- 7. Ensure all base tables have RLS enabled (safety check)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_digest_queue ENABLE ROW LEVEL SECURITY;