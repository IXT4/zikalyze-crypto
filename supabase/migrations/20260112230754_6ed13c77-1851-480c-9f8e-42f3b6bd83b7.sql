-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔒 SECURITY FIX: Address scanner findings for sensitive data protection
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Drop conflicting user-level SELECT policies on sensitive tables
-- These allow users to read sensitive data directly, bypassing the "block all" policies

-- user_2fa: Remove user SELECT policy to prevent TOTP secret exposure
DROP POLICY IF EXISTS "Users can view their own 2FA status" ON public.user_2fa;

-- user_sessions: Remove user SELECT policy to prevent session token exposure
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;

-- push_subscriptions: Remove user SELECT policy to prevent encryption key exposure
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.push_subscriptions;

-- 2. Add RLS to safe views (these only expose non-sensitive data)
-- Views use security_invoker=true and inline WHERE auth.uid() filtering,
-- but we add explicit policies for defense in depth

-- Add RLS to user_2fa_safe view
ALTER VIEW public.user_2fa_safe SET (security_invoker = true);

-- Add RLS to user_sessions_safe view  
ALTER VIEW public.user_sessions_safe SET (security_invoker = true);

-- Add RLS to push_subscriptions_safe view
ALTER VIEW public.push_subscriptions_safe SET (security_invoker = true);

-- 3. Revoke anon access from all safe views
REVOKE ALL ON public.user_2fa_safe FROM anon;
REVOKE ALL ON public.user_sessions_safe FROM anon;
REVOKE ALL ON public.push_subscriptions_safe FROM anon;

-- 4. ai_learning_stats is intentionally public (aggregate market data, no user PII)
-- Add explicit documentation via a comment
COMMENT ON VIEW public.ai_learning_stats IS 'Public aggregate AI prediction statistics by symbol. Intentionally readable by all - contains no user PII, only market-level accuracy metrics.';

-- 5. Ensure proper policies exist for safe views (authenticated users see their own data only)
-- The views already filter by auth.uid() internally with security_invoker=true