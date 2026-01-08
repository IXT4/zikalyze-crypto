-- Add RLS policies to the safe views for proper access control

-- Enable RLS on user_2fa_safe view and add policy
ALTER VIEW public.user_2fa_safe SET (security_invoker = true);

-- Enable RLS on user_sessions_safe view
ALTER VIEW public.user_sessions_safe SET (security_invoker = true);

-- Enable RLS on push_subscriptions_safe view
ALTER VIEW public.push_subscriptions_safe SET (security_invoker = true);

-- Grant access to authenticated users only for safe views
GRANT SELECT ON public.user_2fa_safe TO authenticated;
GRANT SELECT ON public.user_sessions_safe TO authenticated;
GRANT SELECT ON public.push_subscriptions_safe TO authenticated;

-- Revoke all access from anon role for all safe views
REVOKE ALL ON public.user_2fa_safe FROM anon;
REVOKE ALL ON public.user_sessions_safe FROM anon;
REVOKE ALL ON public.push_subscriptions_safe FROM anon;