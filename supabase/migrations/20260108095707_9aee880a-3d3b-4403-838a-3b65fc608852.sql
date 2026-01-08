-- Fix security issues for legacy and sensitive tables

-- 1. Fix user_wallets table - This is a legacy table not used in the app
-- Remove the overly permissive SELECT policy and restrict to no access
DROP POLICY IF EXISTS "Authenticated users can view wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Create wallet with validation" ON public.user_wallets;

-- Create a restrictive policy that blocks all access (legacy table)
CREATE POLICY "No public access to legacy wallets"
ON public.user_wallets
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 2. Fix login_attempts table - Remove the permissive SELECT policy
-- This table should only be accessible via the SECURITY DEFINER functions
DROP POLICY IF EXISTS "Service role can read all" ON public.login_attempts;

-- No direct table access - all operations go through check_rate_limit and record_login_attempt functions
-- The functions already use SECURITY DEFINER with proper search_path