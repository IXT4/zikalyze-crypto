-- Enable RLS on login_attempts table (policy already exists blocking all access)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Secure the safe views by revoking anon access (they use security_invoker)
REVOKE ALL ON public.push_subscriptions_safe FROM anon;
REVOKE ALL ON public.user_2fa_safe FROM anon;
REVOKE ALL ON public.user_sessions_safe FROM anon;

-- Grant authenticated users access to safe views only
GRANT SELECT ON public.push_subscriptions_safe TO authenticated;
GRANT SELECT ON public.user_2fa_safe TO authenticated;
GRANT SELECT ON public.user_sessions_safe TO authenticated;