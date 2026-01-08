-- Fix the login_attempts table - add a policy that blocks all direct access
-- All access should go through SECURITY DEFINER functions (check_rate_limit, record_login_attempt)

CREATE POLICY "No direct access to login attempts"
ON public.login_attempts
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);