-- Drop the existing SELECT policy that exposes encrypted secrets
DROP POLICY IF EXISTS "Users can view their own 2FA settings" ON public.user_2fa;

-- Create a new restrictive SELECT policy that blocks all direct reads
-- All reads should go through the user_2fa_safe view or the Edge Function
CREATE POLICY "Block direct read access to 2FA secrets"
ON public.user_2fa
FOR SELECT
TO authenticated
USING (false);

-- Add a comment explaining the security model
COMMENT ON TABLE public.user_2fa IS 'TOTP secrets are encrypted with AES-GCM. Direct SELECT is blocked - use user_2fa_safe view for status checks or totp-2fa Edge Function for operations.';