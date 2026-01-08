-- Remove the permissive INSERT policy - we'll only use the SECURITY DEFINER function
DROP POLICY IF EXISTS "Allow insert attempts" ON public.login_attempts;

-- The record_login_attempt function with SECURITY DEFINER handles all inserts
-- No direct INSERT policy needed