-- Ensure RLS is enabled on login_attempts table
-- The table already has a "No direct access" policy but RLS must be enabled for it to work
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Revoke all access from anon role
REVOKE ALL ON public.login_attempts FROM anon;