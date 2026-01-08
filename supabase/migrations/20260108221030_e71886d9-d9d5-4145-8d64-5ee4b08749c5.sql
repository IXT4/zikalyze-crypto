-- Secure the ai_learning_stats view by revoking anon access
-- This is intentionally public aggregated data but should only be visible to authenticated users

REVOKE ALL ON public.ai_learning_stats FROM anon;
REVOKE ALL ON public.ai_learning_stats FROM public;

-- Grant access only to authenticated users
GRANT SELECT ON public.ai_learning_stats TO authenticated;