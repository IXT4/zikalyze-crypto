-- Add RLS policy to ai_learning_stats view
-- Since this is aggregate learning statistics (not personal data),
-- we can allow authenticated users to view it for transparency
-- while keeping it protected from anonymous access

-- Enable RLS on the view (views inherit RLS from underlying tables,
-- but we need to ensure proper access)
-- Note: ai_learning_stats is a view based on analysis_history which already has RLS

-- For the view, we'll create a policy that allows authenticated users
-- to see aggregated stats (this is AI accuracy data, not personal info)
-- The underlying analysis_history table already restricts access to own data

-- Create a function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- Since ai_learning_stats is a view, we need to ensure proper RLS
-- The view shows aggregated stats per symbol - this is public-facing data
-- about AI model accuracy, not personal user data

-- Grant authenticated users access to the view
GRANT SELECT ON public.ai_learning_stats TO authenticated;

-- Revoke access from anon role to prevent public exposure
REVOKE ALL ON public.ai_learning_stats FROM anon;