-- Add RLS policies to safe views to prevent enumeration attacks

-- Enable RLS on user_sessions_safe view (if not already enabled)
ALTER VIEW public.user_sessions_safe SET (security_invoker = true);

-- Enable RLS on user_2fa_safe view
ALTER VIEW public.user_2fa_safe SET (security_invoker = true);

-- Enable RLS on push_subscriptions_safe view
ALTER VIEW public.push_subscriptions_safe SET (security_invoker = true);

-- Enable RLS on ai_learning_stats view
ALTER VIEW public.ai_learning_stats SET (security_invoker = true);